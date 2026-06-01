import { useState, useEffect } from 'react';

export default function ParloirTimer({ startedAt, durationMinutes = 45 }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const endTime = new Date(startedAt).getTime() + durationMinutes * 60000;
    const calc = () => setRemaining(Math.max(0, Math.ceil((endTime - Date.now()) / 1000)));
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [startedAt, durationMinutes]);

  const totalSeconds = durationMinutes * 60;
  const elapsed = totalSeconds - remaining;
  const pct = Math.min(100, (elapsed / totalSeconds) * 100);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isLow = remaining < 300;

  const r = 44;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;
  const color = isLow ? '#EF4444' : '#3B82F6';

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#334155" strokeWidth="8" />
          <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-mono text-xl font-bold ${isLow ? 'text-red-400' : 'text-blue-400'}`}>
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </span>
          <span className="text-xs text-slate-500">restant</span>
        </div>
      </div>
      {isLow && remaining > 0 && (
        <p className="text-xs text-red-400 mt-1 animate-pulse">Fin imminente</p>
      )}
      {remaining === 0 && (
        <p className="text-xs text-slate-500 mt-1">Temps écoulé</p>
      )}
    </div>
  );
}
