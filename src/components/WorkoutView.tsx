import { useState, useRef } from 'react';
import type { WorkoutDay } from '../data/program';
import { getWeekNumber } from '../data/program';
import {
  createSession,
  completeSession,
  addSetLog,
  saveExerciseDifficulty,
} from '../db/database';
import type { Difficulty } from '../db/database';
import ExerciseCard from './ExerciseCard';
import './WorkoutView.css';

interface Props {
  day: WorkoutDay;
  onBack: () => void;
  onComplete: () => void;
}

type SetEntry = { weight: number; reps: number };

export default function WorkoutView({ day, onBack, onComplete }: Props) {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [sets, setSets] = useState<Record<string, SetEntry[]>>({});
  const [difficulties, setDifficulties] = useState<Record<string, Difficulty>>({});
  const [finishing, setFinishing] = useState(false);

  // Use a ref to hold the in-flight createSession promise so concurrent calls
  // don't create duplicate sessions (e.g. two rapid taps on "Log Set").
  const sessionPromise = useRef<Promise<number> | null>(null);

  function ensureSession(): Promise<number> {
    if (!sessionPromise.current) {
      sessionPromise.current = createSession(day.id, getWeekNumber());
      sessionPromise.current.then(setSessionId);
    }
    return sessionPromise.current;
  }

  async function handleLogSet(exerciseId: string, weight: number, reps: number) {
    const sid = await ensureSession();
    setSets(prev => {
      const existing = prev[exerciseId] ?? [];
      const setNumber = existing.length + 1;
      addSetLog(sid, exerciseId, setNumber, weight, reps);
      return { ...prev, [exerciseId]: [...existing, { weight, reps }] };
    });
  }

  async function handleRateDifficulty(exerciseId: string, difficulty: Difficulty) {
    const sid = await ensureSession();
    await saveExerciseDifficulty(sid, exerciseId, difficulty);
    setDifficulties(prev => ({ ...prev, [exerciseId]: difficulty }));
  }

  async function handleFinish() {
    if (!sessionId || finishing) return;
    setFinishing(true);
    await completeSession(sessionId);
    onComplete();
  }

  const totalSets = Object.values(sets).reduce((sum, s) => sum + s.length, 0);

  return (
    <div className="workout-view">
      <header className="workout-header">
        <button className="back-btn" onClick={onBack} aria-label="Back to dashboard">
          &#8592;
        </button>
        <div className="workout-title">
          <span className="workout-day-label">{day.label}</span>
          <span className="workout-muscles">{day.muscleGroups}</span>
        </div>
      </header>

      <div className="exercise-list">
        {day.exercises.map(ex => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            sets={sets[ex.id] ?? []}
            difficulty={difficulties[ex.id] ?? null}
            onLogSet={(w, r) => handleLogSet(ex.id, w, r)}
            onRateDifficulty={(d) => handleRateDifficulty(ex.id, d)}
          />
        ))}
      </div>

      <div className="finish-bar">
        <button
          className="finish-btn"
          disabled={totalSets === 0 || finishing}
          onClick={handleFinish}
        >
          {finishing ? 'Saving…' : 'Finish Workout'}
        </button>
      </div>
    </div>
  );
}
