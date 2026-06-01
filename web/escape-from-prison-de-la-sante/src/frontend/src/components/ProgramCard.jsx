export default function ProgramCard({ program, enrollment, onEnroll, onComplete }) {
  const progress = enrollment ? (enrollment.sessionsCompleted / program.totalSessions) * 100 : 0;
  const isEnrolled = enrollment && enrollment.status !== 'dropped' && enrollment.status !== 'completed';
  const isCompleted = enrollment?.status === 'completed';

  return (
    <div className={`card ${isCompleted ? 'border border-green-500/30' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold">{program.name}</h3>
        <span className={`badge ${
          program.category === 'anger_management' ? 'badge-red' :
          program.category === 'vocational' ? 'badge-blue' :
          program.category === 'education' ? 'badge-green' :
          program.category === 'therapy' ? 'badge-purple' : 'badge-orange'
        }`}>{program.category.replace('_', ' ')}</span>
      </div>
      <p className="text-xs text-slate-400 mb-3">{program.description}</p>
      <div className="mb-3">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>{enrollment?.sessionsCompleted ?? 0} / {program.totalSessions} sessions</span>
          <span>+{program.conductBonus} conduite</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
      {program.requiredForLeave && (
        <div className="text-xs text-amber-400 mb-2">Requis pour les permissions de sortie</div>
      )}
      {isCompleted ? (
        <span className="badge badge-green">Terminé</span>
      ) : isEnrolled ? (
        <button onClick={() => onComplete(enrollment.id)} className="btn btn-primary btn-sm">
          Compléter une session
        </button>
      ) : (
        <button onClick={() => onEnroll(program.id)} className="btn btn-ghost btn-sm">
          S'inscrire
        </button>
      )}
    </div>
  );
}
