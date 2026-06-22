import { useState, useEffect } from 'react';
import type { WorkoutDay } from '../data/program';
import { getWeekNumber } from '../data/program';
import {
  createSession,
  completeSession,
  addSetLog,
  getSetLogsForSession,
  deleteSetLogsForSession,
} from '../db/database';
import ExerciseCard from './ExerciseCard';
import './WorkoutView.css';

interface Props {
  day: WorkoutDay;
  existingSessionId?: number;
  onBack: () => void;
  onComplete: () => void;
}

type SetEntry = { weight: number; reps: number };

export default function WorkoutView({ day, existingSessionId, onBack, onComplete }: Props) {
  const isEditMode = existingSessionId !== undefined;
  const [sets, setSets] = useState<Record<string, SetEntry[]>>({});
  const [finishing, setFinishing] = useState(false);
  const [loading, setLoading] = useState(isEditMode);

  useEffect(() => {
    if (!existingSessionId) return;
    getSetLogsForSession(existingSessionId).then(setLogs => {
      const groupedSets: Record<string, SetEntry[]> = {};
      for (const sl of setLogs) {
        (groupedSets[sl.exerciseId] ??= []).push({ weight: sl.weight, reps: sl.reps });
      }
      setSets(groupedSets);
      setLoading(false);
    });
  }, [existingSessionId]);

  function handleLogSet(exerciseId: string, weight: number, reps: number) {
    setSets(prev => ({
      ...prev,
      [exerciseId]: [...(prev[exerciseId] ?? []), { weight, reps }],
    }));
  }

  function handleEditSet(exerciseId: string, index: number, weight: number, reps: number) {
    setSets(prev => ({
      ...prev,
      [exerciseId]: (prev[exerciseId] ?? []).map((s, i) =>
        i === index ? { weight, reps } : s
      ),
    }));
  }

  function handleDeleteSet(exerciseId: string, index: number) {
    setSets(prev => ({
      ...prev,
      [exerciseId]: (prev[exerciseId] ?? []).filter((_, i) => i !== index),
    }));
  }

  async function handleFinish() {
    if (finishing) return;
    setFinishing(true);

    const sid = isEditMode
      ? existingSessionId
      : await createSession(day.id, getWeekNumber());

    if (isEditMode) {
      await deleteSetLogsForSession(sid);
    }

    for (const [exerciseId, exerciseSets] of Object.entries(sets)) {
      for (let i = 0; i < exerciseSets.length; i++) {
        await addSetLog(sid, exerciseId, i + 1, exerciseSets[i].weight, exerciseSets[i].reps);
      }
    }

    if (!isEditMode) await completeSession(sid);
    onComplete();
  }

  const totalSets = Object.values(sets).reduce((sum, s) => sum + s.length, 0);

  if (loading) {
    return (
      <div className="workout-view">
        <header className="workout-header">
          <button className="back-btn" onClick={onBack}>&#8592;</button>
          <div className="workout-title">
            <span className="workout-day-label">{day.label}</span>
            <span className="workout-muscles">{day.muscleGroups}</span>
          </div>
        </header>
        <div className="workout-loading">Loading…</div>
      </div>
    );
  }

  return (
    <div className="workout-view">
      <header className="workout-header">
        <button className="back-btn" onClick={onBack} aria-label="Back">&#8592;</button>
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
            onLogSet={(w, r) => handleLogSet(ex.id, w, r)}
            onEditSet={(i, w, r) => handleEditSet(ex.id, i, w, r)}
            onDeleteSet={i => handleDeleteSet(ex.id, i)}
          />
        ))}
      </div>

      <div className="finish-bar">
        <button
          className="finish-btn"
          disabled={totalSets === 0 || finishing}
          onClick={handleFinish}
        >
          {finishing ? 'Saving…' : isEditMode ? 'Save Changes' : 'Finish Workout'}
        </button>
      </div>
    </div>
  );
}
