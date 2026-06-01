import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import toast from 'react-hot-toast';
import { ANNOUNCEMENTS, USERS, ALL_BLOCS } from '../../graphql/queries';
import { CREATE_ANNOUNCEMENT } from '../../graphql/mutations';
import { timeAgo } from '../../lib/format';

const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const PRIORITY_CLASSES = { low: 'badge-gray', normal: 'badge-blue', high: 'badge-orange', urgent: 'badge-red' };

export default function GuardAnnouncements() {
  const { data: announcementsData, refetch } = useQuery(ANNOUNCEMENTS);
  const { data: blocsData } = useQuery(ALL_BLOCS);
  const [createAnnouncement, { loading }] = useMutation(CREATE_ANNOUNCEMENT, {
    onCompleted: () => { toast.success('Annonce publiée'); refetch(); setForm({ title: '', content: '', blocId: '', priority: 'normal' }); },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({ title: '', content: '', blocId: '', priority: 'normal' });
  const announcements = announcementsData?.announcements ?? [];

  function handleSubmit(e) {
    e.preventDefault();
    createAnnouncement({ variables: { ...form, blocId: form.blocId || null } });
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Annonces</h1>
        <p className="text-slate-400 text-sm mt-1">Publications officielles diffusées aux détenus</p>
      </div>

      <div className="card mb-6">
        <h2 className="font-semibold mb-4">Nouvelle annonce</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Titre</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Titre de l'annonce" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Contenu</label>
            <textarea className="input resize-none" rows={3} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Corps du message…" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Priorité</label>
              <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Bloc (optionnel)</label>
              <select className="input" value={form.blocId} onChange={(e) => setForm({ ...form, blocId: e.target.value })}>
                <option value="">Tous les blocs</option>
                {(blocsData?.allBlocs ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary disabled:opacity-50">
            {loading ? 'Publication…' : 'Publier l\'annonce'}
          </button>
        </form>
      </div>

      <div className="space-y-3">
        {announcements.map((a) => (
          <div key={a.id} className={`card border-l-4 ${
            a.priority === 'urgent' ? 'border-red-500' :
            a.priority === 'high' ? 'border-orange-500' :
            a.priority === 'normal' ? 'border-blue-500' : 'border-slate-600'
          }`}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold mb-1">{a.title}</h3>
                <p className="text-slate-400 text-sm mb-2">{a.content}</p>
                <div className="text-xs text-slate-500">
                  {a.author.username} · {timeAgo(a.createdAt)}
                  {a.bloc && <span> · {a.bloc.name}</span>}
                </div>
              </div>
              <span className={`badge ml-3 flex-shrink-0 ${PRIORITY_CLASSES[a.priority]}`}>{a.priority}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
