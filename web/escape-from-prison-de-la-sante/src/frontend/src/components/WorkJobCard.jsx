import { useState, useEffect } from 'react';
import { Clock, CheckCircle } from 'lucide-react';
import { formatCurrency } from '../lib/format';

function CooldownTimer({ completedAt, cooldownMinutes }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const calc = () => {
      const end = new Date(completedAt).getTime() + cooldownMinutes * 60000;
      setRemaining(Math.max(0, Math.ceil((end - Date.now()) / 1000)));
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [completedAt, cooldownMinutes]);

  if (remaining === 0) return null;

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const pct = (remaining / (cooldownMinutes * 60)) * 100;

  return (
    <div>
      <div className="flex justify-between text-xs mb-1 text-slate-400">
        <span>Cooldown actif</span>
        <span className="font-mono text-red-400">{mins}:{String(secs).padStart(2, '0')}</span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full bg-red-500 rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function WorkJobCard({ job, onStartWork, loading }) {
  const lastSession = job.myLastSession;
  const cooldownEnd = lastSession
    ? new Date(lastSession.completedAt).getTime() + job.cooldownMinutes * 60000
    : 0;
  const onCooldown = cooldownEnd > Date.now();

  return (
    <div className="card hover:-translate-y-0.5 transition-transform">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-base">{job.name}</h3>
          <p className="text-slate-400 text-xs mt-0.5">{job.location}</p>
        </div>
        <span className="badge badge-green font-mono">+{formatCurrency(job.payAmount)}</span>
      </div>

      <p className="text-slate-400 text-sm mb-4">{job.description}</p>

      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-4">
        <Clock size={12} />
        <span>Cooldown : {job.cooldownMinutes} min</span>
      </div>

      {onCooldown && lastSession && (
        <div className="mb-4">
          <CooldownTimer completedAt={lastSession.completedAt} cooldownMinutes={job.cooldownMinutes} />
        </div>
      )}

      {lastSession && !onCooldown && (
        <div className="flex items-center gap-1.5 text-xs text-green-400 mb-3">
          <CheckCircle size={12} />
          <span>Dernier gain : {formatCurrency(lastSession.earnings)}</span>
        </div>
      )}

      <button
        onClick={() => onStartWork(job.id)}
        disabled={onCooldown || loading}
        className="btn btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {onCooldown ? 'Cooldown en cours' : loading ? 'En cours…' : 'Prendre le poste'}
      </button>
    </div>
  );
}
