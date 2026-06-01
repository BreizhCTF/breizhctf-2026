import { conductColor } from '../lib/format';

export default function ConductGauge({ score }) {
  const color = conductColor(score);
  const r = 54;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 120 120" className="w-36 h-36 -rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" stroke="#334155" strokeWidth="10" />
          <circle
            cx="60" cy="60" r={r}
            fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-3xl font-bold" style={{ color }}>{score}</span>
          <span className="text-xs text-slate-500">/ 100</span>
        </div>
      </div>
      <div className="text-sm font-semibold mt-1" style={{ color }}>
        {score >= 70 ? 'Bonne conduite' : score >= 40 ? 'À surveiller' : 'Critique'}
      </div>
    </div>
  );
}
