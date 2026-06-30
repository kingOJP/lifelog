import type { Exercise } from './program';
import type { SetLog } from '../db/database';

export interface WeightRec {
  weight: number;
  direction: 'up' | 'down' | 'hold';
  reason: string;
}

// Looks at the most recent session for this exercise and scores it on three
// progressive-overload signals (reps vs range, intra-session weight trend, set
// count) to suggest the next working weight — and explains why.
export function calculateRecommendation(sets: SetLog[], exercise: Exercise): WeightRec | null {
  if (sets.length === 0) return null;

  const sorted = [...sets].sort((a, b) => a.setNumber - b.setNumber);
  const avgWeight = sorted.reduce((sum, s) => sum + s.weight, 0) / sorted.length;

  // Signal 1: average reps vs target rep range
  const avgReps = sorted.reduce((sum, s) => sum + s.reps, 0) / sorted.length;
  const repSignal = avgReps > exercise.repHigh ? 1 : avgReps < exercise.repLow ? -1 : 0;

  // Signal 2: weight trend across sets (first vs last)
  let weightSignal = 0;
  if (sorted.length >= 2) {
    const diff = sorted[sorted.length - 1].weight - sorted[0].weight;
    weightSignal = diff > 0 ? 1 : diff < 0 ? -1 : 0;
  }

  // Signal 3: actual sets completed vs target sets
  const setsSignal = sets.length > exercise.sets ? 1 : sets.length < exercise.sets ? -1 : 0;

  const score = (repSignal + weightSignal + setsSignal) / 3; // -1 to +1
  const weight = Math.round((avgWeight * (1 + score * 0.08)) / 5) * 5;

  const roundedLast = Math.round(avgWeight / 5) * 5;
  const direction: WeightRec['direction'] =
    weight > roundedLast ? 'up' : weight < roundedLast ? 'down' : 'hold';

  return { weight, direction, reason: reasonFor(direction, repSignal, weightSignal, setsSignal) };
}

function reasonFor(
  direction: WeightRec['direction'],
  repSignal: number,
  weightSignal: number,
  setsSignal: number,
): string {
  if (direction === 'up') {
    if (repSignal > 0) return 'Beat your rep range — time to add load';
    if (weightSignal > 0) return 'Built up weight across sets last time';
    if (setsSignal > 0) return 'Logged extra sets last time';
    return 'Progressing — nudge the weight up';
  }
  if (direction === 'down') {
    if (repSignal < 0) return 'Fell short of the rep range last time';
    if (weightSignal < 0) return 'Weight dropped off on later sets';
    if (setsSignal < 0) return 'Cut sets short last time';
    return 'Ease back to rebuild reps';
  }
  return 'Repeat the weight and aim for more reps';
}
