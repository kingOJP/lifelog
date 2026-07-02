import { describe, it, expect, beforeEach } from 'vitest';
import { buildSnapshot } from './analytics';
import { computeCoaching } from './insights';
import type { Session, SetLog } from '../db/database';
import type { WorkoutDay } from './program';

beforeEach(() => localStorage.clear());

const program: WorkoutDay[] = [
  {
    id: 1, label: 'Day 1', muscleGroups: 'Chest',
    exercises: [{ id: 'dumbbell-bench-press', name: 'Dumbbell Bench Press', sets: 3, repLow: 8, repHigh: 10 }],
  },
  {
    id: 2, label: 'Day 2', muscleGroups: 'Back',
    exercises: [{ id: 'lat-pull-down', name: 'Lat Pull Down', sets: 3, repLow: 10, repHigh: 12 }],
  },
];

function flatBenchSessions(): { sessions: Session[]; setLogs: SetLog[] } {
  const sessions: Session[] = [1, 2, 3].map(i => ({
    id: i, dayId: 1, weekNumber: i, startedAt: i * 1000, completedAt: i * 1000 + 500,
  }));
  const setLogs: SetLog[] = sessions.flatMap((s, i) => [
    { id: i * 2 + 1, sessionId: s.id!, exerciseId: 'dumbbell-bench-press', setNumber: 1, weight: 100, reps: 10 },
    { id: i * 2 + 2, sessionId: s.id!, exerciseId: 'dumbbell-bench-press', setNumber: 2, weight: 100, reps: 9 },
  ]);
  return { sessions, setLogs };
}

describe('computeCoaching', () => {
  it('reports no data when nothing is logged, but still suggests a next day', () => {
    const c = computeCoaching(program, buildSnapshot([], []), 1);
    expect(c.hasData).toBe(false);
    expect(c.nextDay).not.toBeNull();
  });

  it('flags under-trained program muscles', () => {
    const { sessions, setLogs } = flatBenchSessions();
    const c = computeCoaching(program, buildSnapshot(sessions, setLogs), 3);
    const low = c.insights.find(i => i.kind === 'volume-low' && i.title.startsWith('Chest'));
    expect(low).toBeDefined();
    // 2 direct chest sets in week 3 → far below the 10-set floor
    const chest = c.muscleVolume.find(v => v.muscle === 'Chest')!;
    expect(chest.sets).toBe(2);
    expect(chest.status).toBe('low');
  });

  it('detects a plateau across three flat sessions', () => {
    const { sessions, setLogs } = flatBenchSessions();
    const c = computeCoaching(program, buildSnapshot(sessions, setLogs), 3);
    const trend = c.trends.find(t => t.exerciseId === 'dumbbell-bench-press')!;
    expect(trend.dir).toBe('flat');
    expect(c.insights.some(i => i.kind === 'plateau')).toBe(true);
  });

  it('suggests the day that has gone longest without training', () => {
    const { sessions, setLogs } = flatBenchSessions(); // only day 1 ever trained
    const c = computeCoaching(program, buildSnapshot(sessions, setLogs), 3);
    expect(c.nextDay?.dayId).toBe(2);
    expect(c.nextDay?.lastTrained).toBeNull();
  });

  it('marks a rising e1RM as an up-trend', () => {
    const sessions: Session[] = [1, 2, 3].map(i => ({
      id: i, dayId: 1, weekNumber: 1, startedAt: i * 1000, completedAt: i * 1000 + 500,
    }));
    const setLogs: SetLog[] = sessions.map((s, i) => ({
      id: i + 1, sessionId: s.id!, exerciseId: 'dumbbell-bench-press',
      setNumber: 1, weight: 100 + i * 10, reps: 10,
    }));
    const c = computeCoaching(program, buildSnapshot(sessions, setLogs), 1);
    const trend = c.trends.find(t => t.exerciseId === 'dumbbell-bench-press')!;
    expect(trend.dir).toBe('up');
    expect(c.insights.some(i => i.kind === 'progress')).toBe(true);
  });
});
