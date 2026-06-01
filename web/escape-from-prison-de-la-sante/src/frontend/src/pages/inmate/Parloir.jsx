import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { ArrowLeft, AlertTriangle, HandCoins } from 'lucide-react';
import toast from 'react-hot-toast';
import { MY_VISIT_REQUESTS, ME } from '../../graphql/queries';
import { ATTEMPT_SMUGGLING } from '../../graphql/mutations';
import { formatCurrency } from '../../lib/format';
import ParloirTimer from '../../components/ParloirTimer';

export default function Parloir() {
  const { id } = useParams();
  const { data: visitsData, refetch } = useQuery(MY_VISIT_REQUESTS, { pollInterval: 10000 });
  const { data: meData } = useQuery(ME);
  const [attemptSmuggling, { loading: smugglingLoading }] = useMutation(ATTEMPT_SMUGGLING, {
    onCompleted: ({ attemptSmugglingDuringVisit: r }) => {
      if (r.success) {
        toast.success(`Transfert réussi : ${formatCurrency(r.amount)} reçus.`);
      } else {
        toast.error(`Tentative interceptée. Pénalité : -${r.conductPenalty} points de conduite.`);
      }
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const [amount, setAmount] = useState('');
  const [showModal, setShowModal] = useState(false);
  const messagesEndRef = useRef(null);

  const visit = visitsData?.myVisitRequests?.find((v) => v.id === id);
  const session = visit?.parloirSession;
  const transcript = session?.transcript ?? [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  if (!visit) {
    return (
      <div className="p-6">
        <div className="text-slate-400">Chargement de la session…</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Link to="/visites" className="btn btn-ghost btn-sm mb-4">
          <ArrowLeft size={14} /> Retour
        </Link>
        <div className="card text-center py-12">
          <p className="text-slate-400">La session de parloir n'a pas encore démarré.</p>
          <p className="text-slate-500 text-sm mt-1">Un gardien doit démarrer la session.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950">
      <div className="border-b border-slate-700 px-6 py-4 flex items-center justify-between bg-slate-900">
        <div className="flex items-center gap-3">
          <Link to="/visites" className="btn btn-ghost btn-sm p-2">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="font-semibold">Parloir — {visit.visitorName}</div>
            <div className="text-xs text-slate-400">{visit.visitorRelation} · {visit.requestedDate} {visit.timeSlot}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {session.startedAt && !session.guardInterrupted && (
            <ParloirTimer startedAt={session.startedAt} durationMinutes={45} />
          )}
          {session.guardInterrupted && (
            <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg text-sm font-semibold">
              <AlertTriangle size={14} />
              Visite interrompue par le personnel
            </div>
          )}
          {!session.guardInterrupted && !session.smugglingAttempt && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 text-xs text-slate-500 hover:text-amber-400 transition-colors px-2 py-1 rounded"
              title="Passer des fonds"
            >
              <HandCoins size={14} />
              <span className="hidden sm:inline">Transfert</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {transcript.map((line, i) => {
          const isInmate = line.speaker === 'inmate';
          return (
            <div key={i} className={`flex ${isInmate ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-sm rounded-2xl px-4 py-3 ${
                isInmate
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-slate-700 text-slate-100 rounded-bl-sm'
              }`}>
                <div className="text-xs font-semibold mb-1 opacity-70">
                  {isInmate ? 'Vous' : visit.visitorName}
                </div>
                <p className="text-sm">{line.text}</p>
                <div className="text-xs opacity-50 mt-1 text-right">{line.timestamp}</div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-sm">
            <h3 className="font-semibold mb-2">Transfert de fonds</h3>
            <p className="text-slate-400 text-sm mb-4">
              Indiquez le montant à transférer. Cette opération est risquée — en cas d'interception,
              une pénalité de conduite sera appliquée.
            </p>
            <input
              className="input mb-4"
              type="number"
              min="1"
              max="500"
              step="1"
              placeholder="Montant en euros"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  attemptSmuggling({ variables: { visitId: id, amount: parseFloat(amount) } });
                  setAmount('');
                }}
                disabled={!amount || smugglingLoading}
                className="btn btn-warning flex-1 justify-center disabled:opacity-50"
              >
                Tenter le transfert
              </button>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
