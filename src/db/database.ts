export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Session {
  id?: number;
  dayId: number;
  weekNumber: number;
  startedAt: number;
  completedAt?: number;
}

export interface SetLog {
  id?: number;
  sessionId: number;
  exerciseId: string;
  setNumber: number;
  weight: number;
  reps: number;
}

export interface ExerciseLog {
  id?: number;
  sessionId: number;
  exerciseId: string;
  difficulty: Difficulty;
}

// Wraps any IDB request in a Promise so we can use async/await instead of callbacks
function idbReq<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('liftlog', 1);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      const sessions = db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
      sessions.createIndex('weekNumber', 'weekNumber');

      const setLogs = db.createObjectStore('setLogs', { keyPath: 'id', autoIncrement: true });
      setLogs.createIndex('sessionId', 'sessionId');

      const exerciseLogs = db.createObjectStore('exerciseLogs', { keyPath: 'id', autoIncrement: true });
      exerciseLogs.createIndex('sessionId', 'sessionId');
    };

    request.onsuccess = () => { _db = request.result; resolve(request.result); };
    request.onerror = () => reject(request.error);
  });
}

export async function createSession(dayId: number, weekNumber: number): Promise<number> {
  const db = await openDB();
  const id = await idbReq(
    db.transaction('sessions', 'readwrite').objectStore('sessions').add({
      dayId, weekNumber, startedAt: Date.now(),
    } as Session),
  );
  return id as number;
}

export async function completeSession(sessionId: number): Promise<void> {
  const db = await openDB();
  const store = db.transaction('sessions', 'readonly').objectStore('sessions');
  const session = await idbReq<Session>(store.get(sessionId));
  session.completedAt = Date.now();
  await idbReq(db.transaction('sessions', 'readwrite').objectStore('sessions').put(session));
}

export async function addSetLog(
  sessionId: number,
  exerciseId: string,
  setNumber: number,
  weight: number,
  reps: number,
): Promise<void> {
  const db = await openDB();
  await idbReq(
    db.transaction('setLogs', 'readwrite').objectStore('setLogs').add({
      sessionId, exerciseId, setNumber, weight, reps,
    } as SetLog),
  );
}

export async function saveExerciseDifficulty(
  sessionId: number,
  exerciseId: string,
  difficulty: Difficulty,
): Promise<void> {
  const db = await openDB();

  // Read in one transaction, write in another — avoids IDB transaction auto-commit issues
  const all = await idbReq<ExerciseLog[]>(
    db.transaction('exerciseLogs', 'readonly')
      .objectStore('exerciseLogs')
      .index('sessionId')
      .getAll(sessionId),
  );
  const existing = all.find(e => e.exerciseId === exerciseId);

  const writeStore = db.transaction('exerciseLogs', 'readwrite').objectStore('exerciseLogs');
  if (existing) {
    await idbReq(writeStore.put({ ...existing, difficulty }));
  } else {
    await idbReq(writeStore.add({ sessionId, exerciseId, difficulty } as ExerciseLog));
  }
}

export async function getCompletedSessionsForWeek(weekNumber: number): Promise<Session[]> {
  const db = await openDB();
  const all = await idbReq<Session[]>(
    db.transaction('sessions', 'readonly')
      .objectStore('sessions')
      .index('weekNumber')
      .getAll(weekNumber),
  );
  return all.filter(s => s.completedAt != null);
}

export async function getAllCompletedSessions(): Promise<Session[]> {
  const db = await openDB();
  const all = await idbReq<Session[]>(
    db.transaction('sessions', 'readonly').objectStore('sessions').getAll(),
  );
  return all
    .filter(s => s.completedAt != null)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
}

export async function getSetLogsForSession(sessionId: number): Promise<SetLog[]> {
  const db = await openDB();
  return idbReq<SetLog[]>(
    db.transaction('setLogs', 'readonly')
      .objectStore('setLogs')
      .index('sessionId')
      .getAll(sessionId),
  );
}
