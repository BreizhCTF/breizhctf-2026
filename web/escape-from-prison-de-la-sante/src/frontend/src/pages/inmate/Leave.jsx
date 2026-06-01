import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { FileText, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { MY_LEAVE_REQUESTS } from '../../graphql/queries';
import { CREATE_LEAVE_REQUEST } from '../../graphql/mutations';
import { formatDate, timeAgo } from '../../lib/format';

const STATUS = { pending: { label: 'En attente', cls: 'badge-yellow' }, approved: { label: 'Approuvée', cls: 'badge-green' }, denied: { label: 'Refusée', cls: 'badge-red' } };

export default function Leave() {
  const { data, refetch } = useQuery(MY_LEAVE_REQUESTS);
  const [createLeaveRequest, { loading }] = useMutation(CREATE_LEAVE_REQUEST, {
    onCompleted: () => { toast.success('Demande de permission envoyée'); refetch(); setShowForm(false); setForm({ reason: '', requestedStart: '', requestedEnd: '' }); },
    onError: (e) => toast.error(e.message),
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ reason: '', requestedStart: '', requestedEnd: '' });

  const requests = data?.myLeaveRequests ?? [];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Permissions de sortie</h1>
          <p className="text-slate-400 text-sm mt-1">Demandez une autorisation temporaire de sortie</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          <Plus size={16} />
          Nouvelle demande
        </button>
      </div>

      <div className="card mb-5 bg-slate-800/50 border-amber-500/20">
        <p className="text-sm text-slate-400">
          Les permissions de sortie sont accordées par la direction de l'établissement.
          Un score de conduite minimum de <strong className="text-amber-400">60/100</strong> est requis.
          La décision est généralement rendue sous 5 à 10 jours ouvrés.
        </p>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h2 className="font-semibold mb-4">Demande de permission</h2>
          <form onSubmit={(e) => { e.preventDefault(); createLeaveRequest({ variables: form }); }} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Motif de la demande</label>
              <textarea className="input resize-none" rows={3} value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Décrivez le motif de votre demande (visite médicale, événement familial, etc.)…" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Date de début</label>
                <input className="input" type="date" value={form.requestedStart} onChange={(e) => setForm({ ...form, requestedStart: e.target.value })} required min={new Date().toISOString().split('T')[0]} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Date de fin</label>
                <input className="input" type="date" value={form.requestedEnd} onChange={(e) => setForm({ ...form, requestedEnd: e.target.value })} required min={form.requestedStart || new Date().toISOString().split('T')[0]} />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={loading} className="btn btn-primary disabled:opacity-50">
                {loading ? 'Envoi…' : 'Soumettre la demande'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">Annuler</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {requests.length === 0 ? (
          <div className="card flex flex-col items-center py-12 text-center">
            <FileText size={40} className="text-slate-600 mb-3" />
            <p className="text-slate-400">Aucune demande de permission</p>
          </div>
        ) : (
          requests.map((req) => {
            const st = STATUS[req.status] || { label: req.status, cls: 'badge-gray' };
            return (
              <div key={req.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-300 mb-2">{req.reason}</p>
                    <div className="flex gap-3 text-xs text-slate-400">
                      <span>Du <span className="font-mono text-blue-400">{formatDate(req.requestedStart)}</span></span>
                      <span>au <span className="font-mono text-blue-400">{formatDate(req.requestedEnd)}</span></span>
                    </div>
                    {req.directorNotes && (
                      <div className="mt-2 text-xs bg-slate-700 px-3 py-2 rounded text-slate-400">
                        <span className="font-semibold">Note de la direction : </span>{req.directorNotes}
                      </div>
                    )}
                    <div className="text-xs text-slate-500 mt-2">{timeAgo(req.createdAt)}</div>
                  </div>
                  <span className={`badge ${st.cls} ml-3 flex-shrink-0`}>{st.label}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
