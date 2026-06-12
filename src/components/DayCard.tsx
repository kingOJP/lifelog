import type { WorkoutDay } from '../data/program';
import './DayCard.css';

interface Props {
  day: WorkoutDay;
  done: boolean;
}

export default function DayCard({ day, done }: Props) {
  return (
    <div className={`day-card${done ? ' done' : ''}`}>
      <div className="day-card-body">
        <div className="day-number">{day.label}</div>
        <div className="day-muscles">{day.muscleGroups}</div>
        <div className="day-count">{day.exercises.length} exercises</div>
      </div>
      {done && <span className="done-badge">DONE</span>}
    </div>
  );
}
