export default function ReputationBadge({ score }) {
  const level =
    score >= 80 ? { label: 'Craint', color: 'text-red-400 bg-red-400/10' } :
    score >= 60 ? { label: 'Respecté', color: 'text-amber-400 bg-amber-400/10' } :
    score >= 30 ? { label: 'Neutre', color: 'text-slate-400 bg-slate-400/10' } :
                  { label: 'Rat', color: 'text-slate-500 bg-slate-500/10' };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${level.color}`}>
      <span className="font-mono">{score}</span>
      <span>{level.label}</span>
    </span>
  );
}
