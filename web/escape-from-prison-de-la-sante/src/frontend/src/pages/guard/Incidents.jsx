import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import toast from 'react-hot-toast';
import { GUARD_INCIDENTS } from '../../graphql/queries';
import { RESOLVE_INCIDENT } from '../../graphql/mutations';
import { timeAgo } from '../../lib/format';

const TYPE_CLASSES = { safety: 'badge-orange', maintenance: 'badge-blue', medical: 'badge-red', complaint: 'badge-yellow', contraband: 'badge-red', fight: 'badge-red', other: 'badge-gray' };

export default function GuardIncidents() {
  const [status, setStatus] = useState(null);
  const { data, refetch } = useQuery(GUARD_INCIDENTS, { variables: { status } });
  const [resolveIncident] = useMutation(RESOLVE_INCIDENT, { onCompleted: () => { toast.success('Incident résolu'); refetch(); }, onError: (e) => toast.error(e.message) });
  const [penalties, setPenalties] = useState({});

  const incidents = data?.incidents ?? [];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Incidents</h1>
        <p className="text-slate-400 text-sm mt-1">Gestion et résolution des incidents déclarés</p>
      </div>

      <div className="flex gap-2 mb-5">
        {[null, 'open', 'resolved', 'closed'].map((s) => (
          <button key={String(s)} onClick={() => setStatus(s)} className={`btn btn-sm ${status === s ? 'btn-primary' : 'btn-ghost'}`}>
            {s === null ? 'Tous' : s}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {incidents.length === 0 ? (
          <div className="card text-center py-10 text-slate-400">Aucun incident</div>
        ) : (
          incidents.map((inc) => (
            <div key={inc.id} className="card">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge ${TYPE_CLASSES[inc.type] || 'badge-gray'}`}>{inc.type}</span>
                    <span className="text-xs text-slate-500">{timeAgo(inc.createdAt)}</span>
                    {inc.conductPenalty > 0 && (
                      <span className="badge badge-red">-{inc.conductPenalty} conduite</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-300">{inc.description}</p>
                  <div className="text-xs text-slate-500 mt-1">
                    Rapporté par : <strong>{inc.reporter?.username}</strong>
                    {inc.involvedInmate && <span> · Impliqué : <strong>{inc.involvedInmate.username}</strong></span>}
                  </div>
                </div>
                <span className={`badge ml-3 ${inc.status === 'open' ? 'badge-yellow' : 'badge-green'}`}>{inc.status}</span>
              </div>

              {inc.status === 'open' && (
                <div className="flex gap-2 items-center flex-wrap mt-3 pt-3 border-t border-slate-700">
                  <input
                    type="number" min="0" max="50"
                    className="input w-32 text-xs"
                    placeholder="Pénalité"
                    value={penalties[inc.id] ?? ''}
                    onChange={(e) => setPenalties({ ...penalties, [inc.id]: Number(e.target.value) })}
                  />
                  <button onClick={() => resolveIncident({ variables: { id: inc.id, status: 'resolved', conductPenalty: penalties[inc.id] ?? 0 } })} className="btn btn-success btn-sm">Résoudre</button>
                  <button onClick={() => resolveIncident({ variables: { id: inc.id, status: 'closed', conductPenalty: 0 } })} className="btn btn-ghost btn-sm">Classer</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
