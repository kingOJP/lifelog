import type { Exercise } from './program';
import type { SetLog } from '../db/database';

export function calculateRecommendedWeight(sets: SetLog[], exercise: Exercise): number | null {
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
  const raw = avgWeight * (1 + score * 0.08);

  return Math.round(raw / 5) * 5;
}
