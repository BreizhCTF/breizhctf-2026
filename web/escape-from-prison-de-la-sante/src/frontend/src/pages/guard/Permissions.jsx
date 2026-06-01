import { useQuery } from '@apollo/client';
import { GUARD_LEAVE_REQUESTS } from '../../graphql/queries';
import { formatDate, timeAgo } from '../../lib/format';
import { useState } from 'react';

export default function GuardPermissions() {
  const [status, setStatus] = useState(null);
  const { data } = useQuery(GUARD_LEAVE_REQUESTS, { variables: { status } });
  const requests = data?.leaveRequests ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Permissions de sortie</h1>
        <p className="text-slate-400 text-sm mt-1">Les décisions sont prises par la direction de l'établissement</p>
      </div>

      <div className="card mb-5 bg-slate-800/50 border-blue-500/20">
        <p className="text-sm text-slate-400">
          Les demandes de permission sont transmises au directeur pour validation.
          Accédez au panel de direction pour approuver ou refuser les demandes.
        </p>
      </div>

      <div className="flex gap-2 mb-5">
        {[null, 'pending', 'approved', 'denied'].map((s) => (
          <button key={String(s)} onClick={() => setStatus(s)} className={`btn btn-sm ${status === s ? 'btn-primary' : 'btn-ghost'}`}>
            {s === null ? 'Tous' : s}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {requests.length === 0 ? (
          <div className="card text-center py-10 text-slate-400">Aucune demande</div>
        ) : (
          requests.map((req) => (
            <div key={req.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-sm mb-1">{req.inmate?.username}</div>
                  <p className="text-sm text-slate-300 mb-2">{req.reason}</p>
                  <div className="flex gap-3 text-xs text-slate-400">
                    <span>Du <span className="font-mono text-blue-400">{formatDate(req.requestedStart)}</span></span>
                    <span>au <span className="font-mono text-blue-400">{formatDate(req.requestedEnd)}</span></span>
                  </div>
                  {req.directorNotes && (
                    <div className="mt-2 text-xs bg-slate-700 px-3 py-1.5 rounded text-slate-400">
                      {req.directorNotes}
                    </div>
                  )}
                  <div className="text-xs text-slate-500 mt-1">{timeAgo(req.createdAt)}</div>
                </div>
                <span className={`badge ml-3 flex-shrink-0 ${req.status === 'pending' ? 'badge-yellow' : req.status === 'approved' ? 'badge-green' : 'badge-red'}`}>
                  {req.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
