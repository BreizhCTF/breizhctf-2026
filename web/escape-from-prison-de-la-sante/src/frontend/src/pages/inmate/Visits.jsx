import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Link } from 'react-router-dom';
import { Calendar, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { MY_VISIT_REQUESTS } from '../../graphql/queries';
import { REQUEST_VISIT } from '../../graphql/mutations';
import { formatDate, timeAgo } from '../../lib/format';

const TIME_SLOTS = ['09:00-10:00', '14:00-15:00', '16:00-17:00'];

const STATUS_LABELS = {
  pending: { label: 'En attente', cls: 'badge-yellow' },
  approved: { label: 'Approuvée', cls: 'badge-green' },
  denied: { label: 'Refusée', cls: 'badge-red' },
  completed: { label: 'Terminée', cls: 'badge-gray' },
};

export default function Visits() {
  const { data, refetch } = useQuery(MY_VISIT_REQUESTS, { pollInterval: 15000 });
  const [requestVisit, { loading }] = useMutation(REQUEST_VISIT, {
    onCompleted: () => { refetch(); setShowForm(false); toast.success('Demande de visite envoyée'); },
    onError: (err) => toast.error(err.message),
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ visitorName: '', visitorRelation: '', visitorPhone: '', requestedDate: '', timeSlot: TIME_SLOTS[0] });

  const visits = data?.myVisitRequests ?? [];

  function handleSubmit(e) {
    e.preventDefault();
    requestVisit({ variables: form });
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Visites familiales</h1>
          <p className="text-slate-400 text-sm mt-1">Gérez vos demandes de visite au parloir</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          <Plus size={16} />
          Nouvelle demande
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h2 className="font-semibold mb-4">Demande de visite</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nom du visiteur</label>
              <input className="input" value={form.visitorName} onChange={(e) => setForm({ ...form, visitorName: e.target.value })} required placeholder="Prénom Nom" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Relation</label>
              <input className="input" value={form.visitorRelation} onChange={(e) => setForm({ ...form, visitorRelation: e.target.value })} required placeholder="Épouse, Parent…" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Téléphone</label>
              <input className="input" type="tel" value={form.visitorPhone} onChange={(e) => setForm({ ...form, visitorPhone: e.target.value })} required placeholder="+33 6 00 00 00 00" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Date souhaitée</label>
              <input className="input" type="date" value={form.requestedDate} onChange={(e) => setForm({ ...form, requestedDate: e.target.value })} required min={new Date().toISOString().split('T')[0]} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Créneau horaire</label>
              <select className="input" value={form.timeSlot} onChange={(e) => setForm({ ...form, timeSlot: e.target.value })}>
                {TIME_SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-3">
              <button type="submit" disabled={loading} className="btn btn-primary disabled:opacity-50">
                {loading ? 'Envoi…' : 'Envoyer la demande'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">Annuler</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {visits.length === 0 ? (
          <div className="card flex flex-col items-center py-12 text-center">
            <Calendar size={40} className="text-slate-600 mb-3" />
            <p className="text-slate-400">Aucune demande de visite</p>
          </div>
        ) : (
          visits.map((v) => {
            const st = STATUS_LABELS[v.status] || { label: v.status, cls: 'badge-gray' };
            return (
              <div key={v.id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{v.visitorName}</div>
                    <div className="text-slate-400 text-sm">{v.visitorRelation} · {v.visitorPhone}</div>
                    <div className="flex gap-3 mt-2 text-sm">
                      <span className="font-mono text-blue-400">{formatDate(v.requestedDate)}</span>
                      <span className="text-slate-500">{v.timeSlot}</span>
                    </div>
                    {v.guardNotes && (
                      <p className="mt-2 text-xs text-slate-400 bg-slate-700 px-3 py-1.5 rounded">{v.guardNotes}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`badge ${st.cls}`}>{st.label}</span>
                    {v.parloirSession && v.status === 'approved' && (
                      <Link to={`/parloir/${v.id}`} className="btn btn-primary btn-sm">Accéder au parloir</Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
