import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Phone, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { MY_APPROVED_CONTACTS, MY_PHONE_CALLS, ME } from '../../graphql/queries';
import { MAKE_PHONE_CALL } from '../../graphql/mutations';
import { formatDateTime } from '../../lib/format';

export default function PhonePage() {
  const { data: contactsData } = useQuery(MY_APPROVED_CONTACTS);
  const { data: callsData, refetch } = useQuery(MY_PHONE_CALLS);
  const { data: meData } = useQuery(ME);
  const [makePhoneCall, { loading }] = useMutation(MAKE_PHONE_CALL, {
    onCompleted: () => { toast.success('Appel passé avec succès !'); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const [selectedContact, setSelectedContact] = useState('');
  const [duration, setDuration] = useState(5);

  const contacts = contactsData?.myApprovedContacts ?? [];
  const calls = callsData?.myPhoneCalls ?? [];
  const credits = meData?.me?.profile?.phoneCredits ?? 0;
  const creditsNeeded = Math.max(1, Math.ceil(duration / 5));

  function handleCall() {
    if (!selectedContact) return;
    makePhoneCall({ variables: { contactId: selectedContact, durationMinutes: duration } });
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Appels téléphoniques</h1>
        <p className="text-slate-400 text-sm mt-1">Passez des appels depuis vos contacts approuvés</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <div className="section-label mb-4">Passer un appel</div>
          <div className="flex items-center justify-between mb-4 p-3 bg-slate-700 rounded-lg">
            <span className="text-sm text-slate-400">Crédits disponibles</span>
            <span className="font-mono font-bold text-amber-400">{credits}</span>
          </div>

          {contacts.length === 0 ? (
            <p className="text-slate-400 text-sm">Aucun contact approuvé. Un gardien doit valider vos contacts.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Contact</label>
                <select className="input" value={selectedContact} onChange={(e) => setSelectedContact(e.target.value)}>
                  <option value="">Sélectionner un contact</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>{c.contactName} ({c.relation})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Durée : {duration} min</label>
                <input
                  type="range" min="5" max="60" step="5"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>5 min</span>
                  <span className="text-amber-400">Coût : {creditsNeeded} crédit{creditsNeeded > 1 ? 's' : ''}</span>
                  <span>60 min</span>
                </div>
              </div>
              <button
                onClick={handleCall}
                disabled={!selectedContact || loading || credits < creditsNeeded}
                className="btn btn-primary w-full justify-center disabled:opacity-50"
              >
                <Phone size={16} />
                {loading ? 'Connexion…' : credits < creditsNeeded ? 'Crédits insuffisants' : 'Appeler'}
              </button>
            </div>
          )}
        </div>

        <div className="card">
          <div className="section-label mb-4">Contacts approuvés</div>
          {contacts.length === 0 ? (
            <p className="text-slate-400 text-sm">Aucun contact</p>
          ) : (
            <div className="space-y-2">
              {contacts.map((c) => (
                <div key={c.id} className="p-3 bg-slate-700 rounded-lg">
                  <div className="font-semibold text-sm">{c.contactName}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{c.relation} · <span className="font-mono">{c.contactPhone}</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="section-label mb-4">Historique des appels</div>
        {calls.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Clock size={28} className="text-slate-600 mb-2" />
            <p className="text-slate-400 text-sm">Aucun appel dans l'historique</p>
          </div>
        ) : (
          <div className="space-y-2">
            {calls.map((call) => (
              <div key={call.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                <div>
                  <div className="font-semibold text-sm">{call.contact.contactName}</div>
                  <div className="text-xs text-slate-400">{formatDateTime(call.calledAt)}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm">{call.durationMinutes} min</div>
                  <div className="text-xs text-amber-400">{call.creditsUsed} crédit{call.creditsUsed > 1 ? 's' : ''}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
