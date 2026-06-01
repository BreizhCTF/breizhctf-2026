import { Users } from 'lucide-react';

export default function GangCard({ gang, isMember, onJoin }) {
  return (
    <div className={`card ${isMember ? 'border border-amber-500/30' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-lg">{gang.name}</h3>
          <p className="text-slate-400 text-sm mt-1">{gang.description}</p>
        </div>
        <div className="p-2 rounded-lg bg-slate-700">
          <Users size={18} className="text-slate-400" />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-slate-500">
          <span className="font-mono font-semibold text-slate-300">{gang.memberCount}</span> membres
          {gang.leader && <span> · Chef : <span className="text-amber-400">{gang.leader.username}</span></span>}
        </div>
        {!isMember && onJoin && (
          <button onClick={() => onJoin(gang.id)} className="btn btn-primary btn-sm">
            Rejoindre
          </button>
        )}
      </div>
    </div>
  );
}
