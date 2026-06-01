import { useQuery, useMutation } from '@apollo/client';
import toast from 'react-hot-toast';
import { MessageSquare, Clock, User } from 'lucide-react';
import { VISIT_REQUESTS } from '../../graphql/queries';
import { INTERRUPT_PARLOIR } from '../../graphql/mutations';
import { timeAgo } from '../../lib/format';

export default function ActiveParloirs() {
  const { data, refetch } = useQuery(VISIT_REQUESTS, {
    variables: { status: 'approved' },
    pollInterval: 10000,
  });

  const [interruptParloir] = useMutation(INTERRUPT_PARLOIR, {
    onCompleted: () => { toast.success('Parloir interrompu'); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const activeSessions = (data?.visitRequests ?? []).filter(
    (v) => v.parloirSession && !v.parloirSession.guardInterrupted
  );

  const completedSessions = (data?.visitRequests ?? []).filter(
    (v) => v.parloirSession && v.parloirSession.guardInterrupted
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Parloirs actifs</h1>
        <p className="text-slate-400 text-sm mt-1">
          {activeSessions.length} session{activeSessions.length !== 1 ? 's' : ''} en cours
        </p>
      </div>

      {activeSessions.length === 0 ? (
        <div className="card text-center py-12 text-slate-400 mb-6">
          <MessageSquare size={36} className="mx-auto mb-3 opacity-30" />
          <p>Aucun parloir en cours actuellement</p>
          <p className="text-xs mt-1 text-slate-600">Actualisation automatique toutes les 10 secondes</p>
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          {activeSessions.map((v) => (
            <div key={v.id} className="card border-l-4 border-blue-500">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <User size={13} className="text-blue-400" />
                      <span className="font-semibold font-mono">{v.inmate?.username}</span>
                    </div>
                    <span className="text-slate-600">↔</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold">{v.visitorName}</span>
                      <span className="text-xs text-slate-500">({v.visitorRelation})</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      Créneau : {v.timeSlot}
                    </span>
                    <span>Démarré {timeAgo(v.parloirSession.startedAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse block" />
                    <span className="text-xs text-blue-400 font-semibold">En cours</span>
                  </div>
                  <button
                    onClick={() => interruptParloir({ variables: { parloirId: v.parloirSession.id } })}
                    className="btn btn-danger btn-sm"
                  >
                    Interrompre
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {completedSessions.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Sessions interrompues aujourd'hui
          </h2>
          <div className="space-y-2">
            {completedSessions.map((v) => (
              <div key={v.id} className="card opacity-60">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-sm">{v.inmate?.username}</span>
                    <span className="text-slate-500 mx-2">↔</span>
                    <span className="text-sm">{v.visitorName}</span>
                  </div>
                  <span className="badge badge-red">Interrompu</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
