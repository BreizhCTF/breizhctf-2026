import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Mail as MailIcon, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { MY_MAIL } from '../../graphql/queries';
import { SEND_MAIL } from '../../graphql/mutations';
import MailCard from '../../components/MailCard';

export default function Mail() {
  const { data, refetch } = useQuery(MY_MAIL);
  const [tab, setTab] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ correspondentName: '', subject: '', content: '' });

  const mail = data?.myMail ?? [];
  const filtered = tab === 'all' ? mail : mail.filter((m) => m.direction === tab);

  const [sendMail, { loading }] = useMutation(SEND_MAIL, {
    onCompleted: () => {
      toast.success('Courrier envoyé');
      setShowForm(false);
      setForm({ correspondentName: '', subject: '', content: '' });
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">Courrier</h1>
          <p className="text-slate-400 text-sm mt-1">Envoyez et recevez du courrier</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary btn-sm">
          <Send size={14} /> Écrire
        </button>
      </div>

      {showForm && (
        <div className="card mb-5">
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!form.correspondentName || !form.content) return;
            sendMail({ variables: form });
          }} className="space-y-3">
            <input className="input" value={form.correspondentName} onChange={(e) => setForm({ ...form, correspondentName: e.target.value })} placeholder="Destinataire" />
            <input className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Sujet (optionnel)" />
            <textarea className="input resize-none" rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Contenu de la lettre…" />
            <button type="submit" disabled={loading} className="btn btn-primary btn-sm disabled:opacity-50">Envoyer</button>
          </form>
        </div>
      )}

      <div className="flex gap-2 mb-5">
        {[{ k: 'all', l: 'Tout' }, { k: 'outgoing', l: 'Envoyé' }, { k: 'incoming', l: 'Reçu' }].map(({ k, l }) => (
          <button key={k} onClick={() => setTab(k)} className={`btn btn-sm ${tab === k ? 'btn-primary' : 'btn-ghost'}`}>{l}</button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card text-center py-10">
            <MailIcon size={32} className="text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Aucun courrier</p>
          </div>
        ) : (
          filtered.map((m) => <MailCard key={m.id} mail={m} />)
        )}
      </div>
    </div>
  );
}
