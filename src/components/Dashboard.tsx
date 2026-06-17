import { useState, useEffect } from 'react';
import { PROGRAM, getWeekNumber, getWeekDateRange } from '../data/program';
import { getCompletedSessionsForWeek } from '../db/database';
import DayCard from './DayCard';
import './Dashboard.css';

interface Props {
  onStartWorkout: (dayId: number) => void;
  onViewHistory: () => void;
}

export default function Dashboard({ onStartWorkout, onViewHistory }: Props) {
  const weekNumber = getWeekNumber();
  const [completedDayIds, setCompletedDayIds] = useState<number[]>([]);

  useEffect(() => {
    getCompletedSessionsForWeek(weekNumber).then(sessions => {
      setCompletedDayIds(sessions.map(s => s.dayId));
    });
  }, [weekNumber]);

  return (
    <div className="dashboard">
      <div className="week-header">
        <span className="week-label">{getWeekDateRange()}</span>
        <span className="week-progress">{completedDayIds.length} of 4 done</span>
      </div>
      <div className="day-list">
        {PROGRAM.map(day => (
          <DayCard
            key={day.id}
            day={day}
            done={completedDayIds.includes(day.id)}
            onClick={() => onStartWorkout(day.id)}
          />
        ))}
      </div>
      <button className="history-btn" onClick={onViewHistory}>
        View History
      </button>
    </div>
  );
}
