import { dumpIDB } from '../db/database';
import type { MuscleGroup } from '../db/database';
import { getWeekNumber } from './program';
import type { WorkoutDay } from './program';
import { getExerciseLibrary, getExerciseName } from './programStore';
import { EXERCISES, EXERCISE_MAP, getExerciseMeta } from './exercises';

// ── Tunables (hypertrophy research) ────────────────────────────────────────────
// ~10–20 hard sets per muscle per week is the commonly cited effective range.
// Secondary muscles count as a fraction of a direct ("hard") set.
export const SETS_TARGET_LOW = 10;
export const SETS_TARGET_HIGH = 20;
const SECONDARY_SET_WEIGHT = 0.5;
const TREND_WINDOW = 3;        // sessions compared for a strength trend
const TREND_THRESHOLD = 3;     // % change that counts as up / down (else flat)

// ── Types ───────────────────────────────────────────────────────────────────────

export type VolumeStatus = 'low' | 'optimal' | 'high';

export interface MuscleVolume {
  muscle: MuscleGroup;
  sets: number;           // fractional weekly sets (rounded to 0.5)
  status: VolumeStatus;
  inProgram: boolean;     // is this muscle a primary target of the current program?
}

export type TrendDir = 'up' | 'flat' | 'down';

export interface ExerciseTrend {
  exerciseId: string;
  name: string;
  dir: TrendDir;
  changePct: number;
  sessions: number;
}

export type InsightKind = 'volume-low' | 'volume-high' | 'plateau' | 'progress';

export interface Insight {
  kind: InsightKind;
  priority: number;       // higher = surface first
  title: string;
  detail: string;
}

export interface NextDay {
  dayId: number;
  label: string;
  muscleGroups: string;
  lastTrained: number | null;   // ms timestamp, null if never
}

export interface Coaching {
  hasData: boolean;
  weekLabel: string;
  nextDay: NextDay | null;
  muscleVolume: MuscleVolume[];
  trends: ExerciseTrend[];
  insights: Insight[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function epley1RM(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}

// Build a name → master-def lookup so custom exercise IDs can still resolve
// their muscle involvement by name.
const nameToDef = new Map(EXERCISES.map(d => [normalizeName(d.name), d]));

// Every muscle an exercise trains, with its fractional set weighting.
// Precedence: user override (getExerciseMeta) → master list → name match.
function musclesForExercise(id: string): { muscle: MuscleGroup; weight: number }[] {
  const meta = getExerciseMeta(id);
  let primary = meta.primaryMuscle;
  let secondaries: (MuscleGroup | null)[] = [
    meta.secondaryMuscle1, meta.secondaryMuscle2, meta.secondaryMuscle3,
  ];

  // Custom IDs with no override fall back to a name match against the master list
  if (!primary && !EXERCISE_MAP.has(id)) {
    const libName = getExerciseLibrary().find(e => e.id === id)?.name;
    const def = libName ? nameToDef.get(normalizeName(libName)) : undefined;
    if (def) {
      primary = def.primaryMuscle;
      secondaries = [...def.secondaryMuscles];
    }
  }

  const out: { muscle: MuscleGroup; weight: number }[] = [];
  if (primary) out.push({ muscle: primary, weight: 1 });
  for (const s of secondaries) if (s) out.push({ muscle: s, weight: SECONDARY_SET_WEIGHT });
  return out;
}

function volumeStatus(sets: number): VolumeStatus {
  if (sets < SETS_TARGET_LOW) return 'low';
  if (sets > SETS_TARGET_HIGH) return 'high';
  return 'optimal';
}

// ── Main ─────────────────────────────────────────────────────────────────────

export async function computeCoaching(program: WorkoutDay[]): Promise<Coaching> {
  const { sessions, setLogs } = await dumpIDB();
  const completed = sessions.filter(s => s.completedAt != null);

  const empty: Coaching = {
    hasData: false,
    weekLabel: '',
    nextDay: nextDayFromProgram(program, completed),
    muscleVolume: [],
    trends: [],
    insights: [],
  };
  if (completed.length === 0 || setLogs.length === 0) return empty;

  // Group sets by session
  const setsBySession = new Map<number, typeof setLogs>();
  for (const log of setLogs) {
    const arr = setsBySession.get(log.sessionId);
    if (arr) arr.push(log);
    else setsBySession.set(log.sessionId, [log]);
  }

  // Which week are we coaching? Current program week, else the latest with data.
  const weeksWithData = [...new Set(completed.map(s => s.weekNumber))].sort((a, b) => b - a);
  const currentWeek = getWeekNumber();
  const coachWeek = weeksWithData.includes(currentWeek) ? currentWeek : (weeksWithData[0] ?? currentWeek);
  const weekLabel = coachWeek === currentWeek ? 'This week' : `Week ${coachWeek}`;

  // ── Fractional set volume per muscle for the coaching week ──
  const volumeMap = new Map<MuscleGroup, number>();
  for (const session of completed) {
    if (session.weekNumber !== coachWeek) continue;
    for (const s of setsBySession.get(session.id!) ?? []) {
      for (const { muscle, weight } of musclesForExercise(s.exerciseId)) {
        volumeMap.set(muscle, (volumeMap.get(muscle) ?? 0) + weight);
      }
    }
  }

  // Muscles the program directly targets (so we only nudge for trained muscles)
  const programMuscles = new Set<MuscleGroup>();
  for (const day of program) {
    for (const ex of day.exercises) {
      const m = musclesForExercise(ex.id)[0]?.muscle;
      if (m) programMuscles.add(m);
    }
  }

  const muscleVolume: MuscleVolume[] = [...new Set([...volumeMap.keys(), ...programMuscles])]
    .map(muscle => {
      const sets = Math.round((volumeMap.get(muscle) ?? 0) * 2) / 2;
      return { muscle, sets, status: volumeStatus(sets), inProgram: programMuscles.has(muscle) };
    })
    .sort((a, b) => b.sets - a.sets);

  // ── Per-exercise strength trend (best Epley e1RM per session) ──
  const e1rmByExercise = new Map<string, { ts: number; value: number }[]>();
  for (const session of completed) {
    const logs = setsBySession.get(session.id!) ?? [];
    if (logs.length === 0) continue;
    const ts = session.completedAt ?? session.startedAt;
    const bestPerExercise = new Map<string, number>();
    for (const s of logs) {
      const e1rm = epley1RM(s.weight, s.reps);
      const prev = bestPerExercise.get(s.exerciseId) ?? 0;
      if (e1rm > prev) bestPerExercise.set(s.exerciseId, e1rm);
    }
    for (const [exId, value] of bestPerExercise) {
      const arr = e1rmByExercise.get(exId);
      if (arr) arr.push({ ts, value });
      else e1rmByExercise.set(exId, [{ ts, value }]);
    }
  }

  const programExerciseIds = new Set(program.flatMap(d => d.exercises.map(e => e.id)));

  const trends: ExerciseTrend[] = [];
  for (const [exerciseId, pts] of e1rmByExercise) {
    if (pts.length < TREND_WINDOW) continue;
    const window = [...pts].sort((a, b) => a.ts - b.ts).slice(-TREND_WINDOW);
    const first = window[0].value;
    const last = window[window.length - 1].value;
    const changePct = first > 0 ? ((last - first) / first) * 100 : 0;
    const dir: TrendDir =
      changePct > TREND_THRESHOLD ? 'up' : changePct < -TREND_THRESHOLD ? 'down' : 'flat';
    trends.push({ exerciseId, name: getExerciseName(exerciseId), dir, changePct, sessions: pts.length });
  }
  trends.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));

  // ── Build the prioritized recommendation list ──
  const insights: Insight[] = [];

  for (const mv of muscleVolume) {
    if (!mv.inProgram) continue;
    if (mv.status === 'low') {
      const gap = SETS_TARGET_LOW - mv.sets;
      insights.push({
        kind: 'volume-low',
        priority: 100 + gap,
        title: `${mv.muscle} is under-trained`,
        detail: `${formatSets(mv.sets)} of ${SETS_TARGET_LOW}+ weekly sets — add about ${Math.ceil(gap)} more.`,
      });
    } else if (mv.status === 'high') {
      insights.push({
        kind: 'volume-high',
        priority: 40,
        title: `${mv.muscle} volume is high`,
        detail: `${formatSets(mv.sets)} weekly sets — past ${SETS_TARGET_HIGH}, watch for junk volume and recovery.`,
      });
    }
  }

  for (const t of trends) {
    if (!programExerciseIds.has(t.exerciseId)) continue;
    if (t.dir === 'flat') {
      insights.push({
        kind: 'plateau',
        priority: 80,
        title: `${t.name} has stalled`,
        detail: `No strength gain across ${t.sessions} sessions — try a light deload week or push for more reps.`,
      });
    } else if (t.dir === 'down') {
      insights.push({
        kind: 'plateau',
        priority: 90,
        title: `${t.name} is trending down`,
        detail: `Est. 1RM down ${Math.abs(Math.round(t.changePct))}% lately — check recovery, sleep, and form.`,
      });
    }
  }

  const progressing = trends.filter(t => t.dir === 'up' && programExerciseIds.has(t.exerciseId)).slice(0, 2);
  for (const t of progressing) {
    insights.push({
      kind: 'progress',
      priority: 20,
      title: `${t.name} is climbing`,
      detail: `Est. 1RM up ${Math.round(t.changePct)}% over your last ${t.sessions} sessions — keep it up.`,
    });
  }

  insights.sort((a, b) => b.priority - a.priority);

  return {
    hasData: true,
    weekLabel,
    nextDay: nextDayFromProgram(program, completed),
    muscleVolume,
    trends,
    insights: insights.slice(0, 6),
  };
}

// Suggest the program day that has gone longest without being trained.
function nextDayFromProgram(
  program: WorkoutDay[],
  completed: { dayId: number; completedAt?: number }[],
): NextDay | null {
  if (program.length === 0) return null;
  const lastByDay = new Map<number, number>();
  for (const s of completed) {
    const ts = s.completedAt ?? 0;
    if (ts > (lastByDay.get(s.dayId) ?? 0)) lastByDay.set(s.dayId, ts);
  }
  const ranked = [...program].sort(
    (a, b) => (lastByDay.get(a.id) ?? 0) - (lastByDay.get(b.id) ?? 0),
  );
  const day = ranked[0];
  return {
    dayId: day.id,
    label: day.label,
    muscleGroups: day.muscleGroups,
    lastTrained: lastByDay.get(day.id) ?? null,
  };
}

function formatSets(sets: number): string {
  return Number.isInteger(sets) ? `${sets}` : sets.toFixed(1);
}
