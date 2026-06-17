import { useState, useEffect } from 'react';
import { PROGRAM, getExerciseName } from '../data/program';
import { getAllCompletedSessions, getSetLogsForSession } from '../db/database';
import type { Session, SetLog } from '../db/database';
import './HistoryView.css';

interface Props {
  onBack: () => void;
}

interface HistoryEntry {
  session: Session;
  sets: SetLog[];
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function HistoryView({ onBack }: Props) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      const sessions = await getAllCompletedSessions();
      const withSets = await Promise.all(
        sessions.map(async s => ({
          session: s,
          sets: await getSetLogsForSession(s.id!),
        })),
      );
      setEntries(withSets);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="history-view">
      <header className="history-header">
        <button className="back-btn" onClick={onBack} aria-label="Back to dashboard">
          &#8592;
        </button>
        <span className="history-title">History</span>
      </header>

      <div className="history-list">
        {loading && <p className="history-empty">Loading…</p>}

        {!loading && entries.length === 0 && (
          <p className="history-empty">No workouts logged yet.</p>
        )}

        {entries.map(({ session, sets }) => {
          const day = PROGRAM.find(d => d.id === session.dayId);
          const isExpanded = expandedId === session.id;
          const totalSets = sets.length;

          // Group sets by exercise, preserving day order
          const exerciseOrder = day?.exercises.map(e => e.id) ?? [];
          const grouped = sets.reduce<Record<string, SetLog[]>>((acc, s) => {
            (acc[s.exerciseId] ??= []).push(s);
            return acc;
          }, {});
          const orderedExercises = [
            ...exerciseOrder.filter(id => grouped[id]),
            ...Object.keys(grouped).filter(id => !exerciseOrder.includes(id)),
          ];

          return (
            <div
              key={session.id}
              className={`history-card${isExpanded ? ' expanded' : ''}`}
              onClick={() => setExpandedId(isExpanded ? null : (session.id ?? null))}
            >
              <div className="history-card-header">
                <div className="history-card-left">
                  <span className="history-date">{formatDate(session.completedAt!)}</span>
                  <span className="history-day-label">
                    {day ? `${day.label} — ${day.muscleGroups}` : `Day ${session.dayId}`}
                  </span>
                  <span className="history-summary">
                    {orderedExercises.length} exercise{orderedExercises.length !== 1 ? 's' : ''} · {totalSets} sets
                  </span>
                </div>
                <span className="history-chevron">{isExpanded ? '▲' : '▼'}</span>
              </div>

              {isExpanded && (
                <div className="history-detail">
                  {orderedExercises.map(exId => (
                    <div key={exId} className="history-exercise">
                      <span className="history-ex-name">{getExerciseName(exId)}</span>
                      <div className="history-sets">
                        {(grouped[exId] ?? []).map((s, i) => (
                          <div key={i} className="history-set-row">
                            <span className="history-set-num">Set {s.setNumber}</span>
                            <span className="history-set-weight">{s.weight} lbs</span>
                            <span className="history-set-reps">{s.reps} reps</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
