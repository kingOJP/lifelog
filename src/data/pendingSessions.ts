const KEY = 'liftlog_pending_sessions';

export interface PendingSession {
  startedAt: number;
  completedAt: number;
  dayId: number;
  weekNumber: number;
  setLogs: { exerciseId: string; setNumber: number; weight: number; reps: number }[];
}

export function savePendingSession(entry: PendingSession): void {
  const existing = getPendingSessions().filter(p => p.startedAt !== entry.startedAt);
  existing.push(entry);
  localStorage.setItem(KEY, JSON.stringify(existing));
}

export function getPendingSessions(): PendingSession[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function clearPendingSessions(): void {
  localStorage.removeItem(KEY);
}
