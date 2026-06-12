import { PROGRAM, PROGRAM_START } from '../data/program';
import DayCard from './DayCard';
import './Dashboard.css';

function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(PROGRAM_START);
  start.setHours(0, 0, 0, 0);
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.max(1, Math.floor((now.getTime() - start.getTime()) / msPerWeek) + 1);
}

export default function Dashboard() {
  const weekNumber = getWeekNumber();
  // Will be populated from IndexedDB in Milestone 3
  const completedDayIds: number[] = [];

  return (
    <div className="dashboard">
      <div className="week-header">
        <span className="week-label">Week {weekNumber}</span>
        <span className="week-progress">{completedDayIds.length} of 4 done</span>
      </div>
      <div className="day-list">
        {PROGRAM.map(day => (
          <DayCard
            key={day.id}
            day={day}
            done={completedDayIds.includes(day.id)}
          />
        ))}
      </div>
    </div>
  );
}
