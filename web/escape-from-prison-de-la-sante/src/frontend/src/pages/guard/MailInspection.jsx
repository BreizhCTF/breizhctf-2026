import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { ALL_MAIL } from '../../graphql/queries';
import { INTERCEPT_MAIL, DELIVER_MAIL } from '../../graphql/mutations';
import MailCard from '../../components/MailCard';

export default function MailInspection() {
  const { data, refetch } = useQuery(ALL_MAIL);
  const [filter, setFilter] = useState(null);

  const allMail = data?.allMail ?? [];
  const displayed = filter ? allMail.filter((m) => m.status === filter) : allMail;

  const [intercept] = useMutation(INTERCEPT_MAIL, {
    onCompleted: () => { toast.success('Courrier intercepté'); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const [deliver] = useMutation(DELIVER_MAIL, {
    onCompleted: () => { toast.success('Courrier distribué'); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Inspection du Courrier</h1>
        <p className="text-slate-400 text-sm mt-1">Contrôlez et distribuez le courrier des détenus</p>
      </div>

      <div className="flex gap-2 mb-5">
        {[null, 'pending', 'delivered', 'intercepted'].map((s) => (
          <button key={String(s)} onClick={() => setFilter(s)} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-ghost'}`}>
            {s === null ? 'Tous' : s === 'pending' ? 'En attente' : s === 'delivered' ? 'Distribué' : 'Intercepté'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {displayed.length === 0 ? (
          <div className="card text-center py-10">
            <Mail size={32} className="text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Aucun courrier</p>
          </div>
        ) : (
          displayed.map((m) => (
            <MailCard
              key={m.id}
              mail={m}
              showInmate
              onIntercept={(id) => intercept({ variables: { mailId: id } })}
              onDeliver={(id) => deliver({ variables: { mailId: id } })}
            />
          ))
        )}
      </div>
    </div>
  );
}
