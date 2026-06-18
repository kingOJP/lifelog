import { PROGRAM, RETIRED_EXERCISES, type Exercise, type WorkoutDay } from './program';

const PROGRAM_KEY = 'liftlog_program';
const LIBRARY_KEY = 'liftlog_exercises';

// ── Program ─────────────────────────────────────────────────────────────────

export function getStoredProgram(): WorkoutDay[] {
  try {
    const raw = localStorage.getItem(PROGRAM_KEY);
    if (raw) return JSON.parse(raw) as WorkoutDay[];
  } catch { /* corrupt data — fall through */ }
  return PROGRAM;
}

export function saveStoredProgram(program: WorkoutDay[]): void {
  localStorage.setItem(PROGRAM_KEY, JSON.stringify(program));
}

// ── Exercise library ─────────────────────────────────────────────────────────

function buildDefaultLibrary(): Exercise[] {
  const seen = new Set<string>();
  return [...PROGRAM.flatMap(d => d.exercises), ...RETIRED_EXERCISES].filter(e => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
}

export function getExerciseLibrary(): Exercise[] {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (raw) return JSON.parse(raw) as Exercise[];
  } catch { /* fall through */ }
  return buildDefaultLibrary();
}

export function saveExerciseLibrary(exercises: Exercise[]): void {
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(exercises));
}

export function addToExerciseLibrary(exercise: Exercise): void {
  const lib = getExerciseLibrary();
  if (!lib.find(e => e.id === exercise.id)) {
    saveExerciseLibrary([...lib, exercise]);
  }
}

export function getExerciseName(id: string): string {
  return getExerciseLibrary().find(e => e.id === id)?.name ?? id;
}

export function generateExerciseId(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${slug}-${Date.now()}`;
}
