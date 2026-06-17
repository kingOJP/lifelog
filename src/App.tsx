import { useState } from 'react';
import { PROGRAM } from './data/program';
import Dashboard from './components/Dashboard';
import WorkoutView from './components/WorkoutView';
import HistoryView from './components/HistoryView';
import './App.css';

type View =
  | { screen: 'dashboard' }
  | { screen: 'workout'; dayId: number }
  | { screen: 'history' };

function App() {
  const [view, setView] = useState<View>({ screen: 'dashboard' });

  if (view.screen === 'workout') {
    const day = PROGRAM.find(d => d.id === view.dayId)!;
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
        <HistoryView onBack={() => setView({ screen: 'dashboard' })} />
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
          onStartWorkout={(dayId) => setView({ screen: 'workout', dayId })}
          onViewHistory={() => setView({ screen: 'history' })}
        />
      </main>
    </div>
  );
}

export default App;
