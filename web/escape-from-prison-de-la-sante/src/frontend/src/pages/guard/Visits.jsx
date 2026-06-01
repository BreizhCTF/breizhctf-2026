import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import toast from 'react-hot-toast';
import { VISIT_REQUESTS } from '../../graphql/queries';
import { UPDATE_VISIT_REQUEST, START_PARLOIR, INTERRUPT_PARLOIR } from '../../graphql/mutations';
import { formatDate } from '../../lib/format';

const STATUS_OPTIONS = [null, 'pending', 'approved', 'denied', 'completed'];

export default function GuardVisits() {
  const [status, setStatus] = useState(null);
  const { data, refetch } = useQuery(VISIT_REQUESTS, { variables: { status } });
  const [updateVisit] = useMutation(UPDATE_VISIT_REQUEST, { onCompleted: () => { toast.success('Statut mis à jour'); refetch(); }, onError: (e) => toast.error(e.message) });
  const [startParloir] = useMutation(START_PARLOIR, { onCompleted: () => { toast.success('Session parloir démarrée'); refetch(); }, onError: (e) => toast.error(e.message) });
  const [interruptParloir] = useMutation(INTERRUPT_PARLOIR, { onCompleted: () => { toast.success('Parloir interrompu'); refetch(); }, onError: (e) => toast.error(e.message) });
  const [notes, setNotes] = useState({});

  const visits = data?.visitRequests ?? [];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Demandes de visite</h1>
        <p className="text-slate-400 text-sm mt-1">Gestion des visites familiales et parloirs</p>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {STATUS_OPTIONS.map((s) => (
          <button key={String(s)} onClick={() => setStatus(s)} className={`btn btn-sm ${status === s ? 'btn-primary' : 'btn-ghost'}`}>
            {s ?? 'Tous'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {visits.length === 0 ? (
          <div className="card text-center py-10 text-slate-400">Aucune visite</div>
        ) : (
          visits.map((v) => (
            <div key={v.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold">{v.visitorName}</div>
                  <div className="text-sm text-slate-400">{v.visitorRelation} · <span className="font-mono">{v.visitorPhone}</span></div>
                  <div className="text-xs text-slate-500 mt-1">
                    Détenu : <strong>{v.inmate?.username}</strong>
                    {' · '}<span className="font-mono">{formatDate(v.requestedDate)}</span>
                    {' · '}{v.timeSlot}
                  </div>
                </div>
                <span className={`badge ${v.status === 'pending' ? 'badge-yellow' : v.status === 'approved' ? 'badge-green' : v.status === 'denied' ? 'badge-red' : 'badge-gray'}`}>
                  {v.status}
                </span>
              </div>

              {v.status === 'pending' && (
                <div className="flex gap-2 items-end flex-wrap">
                  <input
                    className="input text-xs flex-1 min-w-[200px]"
                    placeholder="Notes (optionnel)"
                    value={notes[v.id] || ''}
                    onChange={(e) => setNotes({ ...notes, [v.id]: e.target.value })}
                  />
                  <button onClick={() => updateVisit({ variables: { id: v.id, status: 'approved', notes: notes[v.id] } })} className="btn btn-success btn-sm">Approuver</button>
                  <button onClick={() => updateVisit({ variables: { id: v.id, status: 'denied', notes: notes[v.id] } })} className="btn btn-danger btn-sm">Refuser</button>
                </div>
              )}

              {v.status === 'approved' && !v.parloirSession && (
                <button onClick={() => startParloir({ variables: { visitRequestId: v.id } })} className="btn btn-primary btn-sm">
                  Démarrer le parloir
                </button>
              )}

              {v.parloirSession && (
                <div className="flex items-center gap-3 mt-2">
                  <span className="badge badge-blue">Parloir actif</span>
                  {!v.parloirSession.guardInterrupted && (
                    <button onClick={() => interruptParloir({ variables: { parloirId: v.parloirSession.id } })} className="btn btn-danger btn-sm">
                      Interrompre
                    </button>
                  )}
                  {v.parloirSession.guardInterrupted && (
                    <span className="badge badge-red">Interrompu</span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
