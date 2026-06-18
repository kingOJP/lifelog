import { useState } from 'react';
import type { WorkoutDay, Exercise } from '../data/program';
import { addToExerciseLibrary, generateExerciseId } from '../data/programStore';
import './DayEditView.css';

interface Props {
  day: WorkoutDay;
  onBack: () => void;
  onSave: (updated: WorkoutDay) => void;
}

export default function DayEditView({ day, onBack, onSave }: Props) {
  const [muscleGroups, setMuscleGroups] = useState(day.muscleGroups);
  const [exercises, setExercises] = useState<Exercise[]>(day.exercises);

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSets, setNewSets] = useState('3');
  const [newRepLow, setNewRepLow] = useState('8');
  const [newRepHigh, setNewRepHigh] = useState('12');

  function handleRemove(id: string) {
    setExercises(prev => prev.filter(e => e.id !== id));
  }

  function handleAddExercise() {
    const trimmed = newName.trim();
    if (!trimmed) return;

    const exercise: Exercise = {
      id: generateExerciseId(trimmed),
      name: trimmed,
      sets: Number(newSets) || 3,
      repLow: Number(newRepLow) || 8,
      repHigh: Number(newRepHigh) || 12,
    };

    addToExerciseLibrary(exercise);
    setExercises(prev => [...prev, exercise]);

    setNewName('');
    setNewSets('3');
    setNewRepLow('8');
    setNewRepHigh('12');
    setShowAdd(false);
  }

  function handleSave() {
    onSave({ ...day, muscleGroups, exercises });
  }

  return (
    <div className="day-edit-view">
      <header className="day-edit-header">
        <button className="back-btn" onClick={onBack} aria-label="Back">&#8592;</button>
        <div className="day-edit-title">
          <span className="day-edit-label">{day.label}</span>
          <span className="day-edit-heading">Edit Day</span>
        </div>
      </header>

      <div className="day-edit-body">
        <section className="day-edit-section">
          <label className="day-edit-field-label" htmlFor="muscle-input">Muscle Group</label>
          <input
            id="muscle-input"
            className="day-edit-text-input"
            type="text"
            value={muscleGroups}
            onChange={e => setMuscleGroups(e.target.value)}
            placeholder="e.g. Chest / Tris / Shoulders"
          />
        </section>

        <section className="day-edit-section">
          <span className="day-edit-field-label">Exercises</span>
          <div className="exercise-edit-list">
            {exercises.map(ex => (
              <div key={ex.id} className="exercise-edit-row">
                <div className="exercise-edit-info">
                  <span className="exercise-edit-name">{ex.name}</span>
                  <span className="exercise-edit-meta">{ex.sets} sets · {ex.repLow}–{ex.repHigh} reps</span>
                </div>
                <button
                  className="exercise-remove-btn"
                  onClick={() => handleRemove(ex.id)}
                  aria-label={`Remove ${ex.name}`}
                >
                  ×
                </button>
              </div>
            ))}

            {exercises.length === 0 && (
              <p className="exercise-edit-empty">No exercises — add one below.</p>
            )}
          </div>

          {!showAdd && (
            <button className="add-exercise-trigger" onClick={() => setShowAdd(true)}>
              + Add Exercise
            </button>
          )}

          {showAdd && (
            <div className="add-exercise-form">
              <input
                className="day-edit-text-input"
                type="text"
                placeholder="Exercise name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoFocus
              />
              <div className="add-exercise-nums">
                <label className="num-label">
                  <span>Sets</span>
                  <input
                    className="day-edit-num-input"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={newSets}
                    onChange={e => setNewSets(e.target.value)}
                  />
                </label>
                <label className="num-label">
                  <span>Rep Low</span>
                  <input
                    className="day-edit-num-input"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={newRepLow}
                    onChange={e => setNewRepLow(e.target.value)}
                  />
                </label>
                <label className="num-label">
                  <span>Rep High</span>
                  <input
                    className="day-edit-num-input"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={newRepHigh}
                    onChange={e => setNewRepHigh(e.target.value)}
                  />
                </label>
              </div>
              <div className="add-exercise-actions">
                <button
                  className="add-ex-confirm-btn"
                  onClick={handleAddExercise}
                  disabled={!newName.trim()}
                >
                  Add
                </button>
                <button
                  className="add-ex-cancel-btn"
                  onClick={() => { setShowAdd(false); setNewName(''); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="day-edit-footer">
        <button className="day-edit-save-btn" onClick={handleSave}>
          Save Changes
        </button>
      </div>
    </div>
  );
}
