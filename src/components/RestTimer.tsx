import { useState, useEffect, useRef } from 'react';
import './RestTimer.css';

const DURATION_KEY = 'liftlog_rest_seconds';
const PRESETS = [60, 90, 120, 180];
const DEFAULT_DURATION = 120;

function getRestDuration(): number {
  const raw = Number(localStorage.getItem(DURATION_KEY));
  return PRESETS.includes(raw) ? raw : DEFAULT_DURATION;
}

// Wall-clock read, kept at module scope so it stays outside React's purity model.
const clockNow = () => Date.now();

interface Props {
  // Increment this (e.g. a logged-set counter) to (re)start the countdown.
  runId: number;
  onDismiss: () => void;
}

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function RestTimer({ runId, onDismiss }: Props) {
  const [duration, setDuration] = useState(getRestDuration);
  const [remaining, setRemaining] = useState(0);
  const [done, setDone] = useState(false);
  const endRef = useRef<number>(0);

  // (Re)start whenever runId changes (a new set was logged). The countdown is an
  // external (wall-clock) system, so driving state from an effect is intentional.
  useEffect(() => {
    if (runId === 0) return;
    endRef.current = clockNow() + duration * 1000;
    setRemaining(duration);
    setDone(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  // Tick once per second off a wall-clock deadline (survives tab throttling)
  useEffect(() => {
    if (runId === 0 || done) return;
    const id = setInterval(() => {
      const left = Math.round((endRef.current - clockNow()) / 1000);
      if (left <= 0) {
        setRemaining(0);
        setDone(true);
        if ('vibrate' in navigator) navigator.vibrate([120, 60, 120]);
        clearInterval(id);
      } else {
        setRemaining(left);
      }
    }, 250);
    return () => clearInterval(id);
  }, [runId, done]);

  if (runId === 0) return null;

  function adjust(delta: number) {
    endRef.current = Math.max(clockNow(), endRef.current + delta * 1000);
    const left = Math.max(0, Math.round((endRef.current - clockNow()) / 1000));
    setRemaining(left);
    if (left > 0) setDone(false);
  }

  function pickPreset(sec: number) {
    setDuration(sec);
    localStorage.setItem(DURATION_KEY, String(sec));
    endRef.current = clockNow() + sec * 1000;
    setRemaining(sec);
    setDone(false);
  }

  const pct = duration > 0 ? Math.max(0, Math.min(1, remaining / duration)) : 0;

  return (
    <div className={`rest-timer${done ? ' done' : ''}`}>
      <div className="rest-progress" style={{ width: `${pct * 100}%` }} />
      <div className="rest-row">
        <div className="rest-readout">
          <span className="rest-label">{done ? 'Rest done' : 'Rest'}</span>
          <span className="rest-clock">{fmt(remaining)}</span>
        </div>

        <div className="rest-presets">
          {PRESETS.map(p => (
            <button
              key={p}
              className={`rest-preset${duration === p ? ' active' : ''}`}
              onClick={() => pickPreset(p)}
            >
              {p < 60 ? `${p}s` : `${p / 60}m`}
            </button>
          ))}
        </div>

        <div className="rest-controls">
          <button className="rest-adjust" onClick={() => adjust(-15)} aria-label="Minus 15 seconds">−15</button>
          <button className="rest-adjust" onClick={() => adjust(15)} aria-label="Plus 15 seconds">+15</button>
          <button className="rest-skip" onClick={onDismiss} aria-label="Skip rest">Skip</button>
        </div>
      </div>
    </div>
  );
}
