import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { AlertCircle, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { MY_INCIDENTS } from '../../graphql/queries';
import { CREATE_INCIDENT } from '../../graphql/mutations';
import { timeAgo } from '../../lib/format';

const TYPES = [
  { value: 'safety', label: 'Sécurité' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'medical', label: 'Médical' },
  { value: 'complaint', label: 'Plainte' },
  { value: 'other', label: 'Autre' },
];

const STATUS_CLASSES = { open: 'badge-yellow', resolved: 'badge-green', dismissed: 'badge-gray' };

export default function Incidents() {
  const { data, refetch } = useQuery(MY_INCIDENTS);
  const [createIncident, { loading }] = useMutation(CREATE_INCIDENT, {
    onCompleted: () => { toast.success('Signalement envoyé'); refetch(); setShowForm(false); setForm({ type: 'safety', description: '' }); },
    onError: (e) => toast.error(e.message),
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'safety', description: '' });

  const incidents = data?.myIncidents ?? [];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Signalements</h1>
          <p className="text-slate-400 text-sm mt-1">Déclarez un incident ou une situation problématique</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          <Plus size={16} />
          Nouveau signalement
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h2 className="font-semibold mb-4">Nouveau signalement</h2>
          <form onSubmit={(e) => { e.preventDefault(); createIncident({ variables: form }); }} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Type</label>
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Description</label>
              <textarea className="input resize-none" rows={4} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Décrivez la situation avec précision…" required />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={loading} className="btn btn-primary disabled:opacity-50">
                {loading ? 'Envoi…' : 'Envoyer'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">Annuler</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {incidents.length === 0 ? (
          <div className="card flex flex-col items-center py-12 text-center">
            <AlertCircle size={40} className="text-slate-600 mb-3" />
            <p className="text-slate-400">Aucun signalement</p>
          </div>
        ) : (
          incidents.map((inc) => (
            <div key={inc.id} className="card">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge badge-yellow text-xs">{inc.type}</span>
                    <span className="text-xs text-slate-500">{timeAgo(inc.createdAt)}</span>
                  </div>
                  <p className="text-sm text-slate-300">{inc.description}</p>
                  {inc.conductPenalty > 0 && (
                    <p className="text-xs text-red-400 mt-1">Pénalité : -{inc.conductPenalty} points de conduite</p>
                  )}
                </div>
                <span className={`badge ${STATUS_CLASSES[inc.status] || 'badge-gray'} ml-3 flex-shrink-0`}>{inc.status}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
