import { useState } from 'react';
import type { WorkoutDay } from './data/program';
import { getStoredProgram, saveStoredProgram } from './data/programStore';
import Dashboard from './components/Dashboard';
import WorkoutView from './components/WorkoutView';
import HistoryView from './components/HistoryView';
import DayEditView from './components/DayEditView';
import './App.css';

type View =
  | { screen: 'dashboard' }
  | { screen: 'workout'; dayId: number }
  | { screen: 'history' }
  | { screen: 'edit-session'; sessionId: number; dayId: number }
  | { screen: 'edit-day'; dayId: number };

function App() {
  const [view, setView] = useState<View>({ screen: 'dashboard' });
  const [program, setProgram] = useState<WorkoutDay[]>(getStoredProgram);

  function handleUpdateDay(updated: WorkoutDay) {
    const next = program.map(d => (d.id === updated.id ? updated : d));
    setProgram(next);
    saveStoredProgram(next);
    setView({ screen: 'dashboard' });
  }

  if (view.screen === 'workout') {
    const day = program.find(d => d.id === view.dayId)!;
    return (
      <div className="app">
        <WorkoutView
          day={day}
          onBack={() => setView({ screen: 'dashboard' })}
          onComplete={() => setView({ screen: 'dashboard' })}
        />
      </div>
    );
  }

  if (view.screen === 'history') {
    return (
      <div className="app">
        <HistoryView
          program={program}
          onBack={() => setView({ screen: 'dashboard' })}
          onEditSession={(sessionId, dayId) =>
            setView({ screen: 'edit-session', sessionId, dayId })
          }
        />
      </div>
    );
  }

  if (view.screen === 'edit-session') {
    const day = program.find(d => d.id === view.dayId)!;
    return (
      <div className="app">
        <WorkoutView
          day={day}
          existingSessionId={view.sessionId}
          onBack={() => setView({ screen: 'history' })}
          onComplete={() => setView({ screen: 'history' })}
        />
      </div>
    );
  }

  if (view.screen === 'edit-day') {
    const day = program.find(d => d.id === view.dayId)!;
    return (
      <div className="app">
        <DayEditView
          day={day}
          onBack={() => setView({ screen: 'dashboard' })}
          onSave={handleUpdateDay}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>LiftLog</h1>
      </header>
      <main className="app-main">
        <Dashboard
          program={program}
          onStartWorkout={dayId => setView({ screen: 'workout', dayId })}
          onEditDay={dayId => setView({ screen: 'edit-day', dayId })}
          onViewHistory={() => setView({ screen: 'history' })}
        />
      </main>
    </div>
  );
}

export default App;
