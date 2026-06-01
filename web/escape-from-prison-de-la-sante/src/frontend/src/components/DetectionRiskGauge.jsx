export default function DetectionRiskGauge({ riskLevel }) {
  const color =
    riskLevel >= 70 ? 'bg-red-500' :
    riskLevel >= 40 ? 'bg-amber-500' : 'bg-green-500';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${riskLevel}%` }} />
      </div>
      <span className="text-xs font-mono text-slate-400">{riskLevel}%</span>
    </div>
  );
}
