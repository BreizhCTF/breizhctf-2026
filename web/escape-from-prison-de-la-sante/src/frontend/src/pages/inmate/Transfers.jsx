import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Send, ArrowRightLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { MY_TRANSFERS, INMATES_IN_BLOC, ME } from '../../graphql/queries';
import { TRANSFER_FUNDS } from '../../graphql/mutations';
import { formatCurrency, timeAgo } from '../../lib/format';

export default function Transfers() {
  const { data: meData } = useQuery(ME);
  const { data: transfersData, refetch } = useQuery(MY_TRANSFERS);
  const { data: inmatesData } = useQuery(INMATES_IN_BLOC);
  const [recipientId, setRecipientId] = useState('');
  const [amount, setAmount] = useState('');

  const transfers = transfersData?.myTransfers ?? [];
  const inmates = inmatesData?.inmatesInBloc ?? [];
  const balance = meData?.me?.profile?.walletBalance ?? 0;

  const [transfer, { loading }] = useMutation(TRANSFER_FUNDS, {
    onCompleted: () => {
      toast.success('Virement effectué');
      setRecipientId('');
      setAmount('');
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Transferts de Fonds</h1>
        <p className="text-slate-400 text-sm mt-1">Envoyez de l'argent à un autre détenu — les montants &gt; 50€ sont signalés</p>
      </div>

      <div className="card mb-5">
        <div className="section-label mb-4">Nouveau virement</div>
        <div className="text-xs text-slate-500 mb-3">Solde : <span className="font-mono text-slate-200">{formatCurrency(balance)}</span></div>
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!recipientId || !amount) return;
          transfer({ variables: { recipientId, amount: parseFloat(amount) } });
        }} className="space-y-3">
          <select className="input" value={recipientId} onChange={(e) => setRecipientId(e.target.value)}>
            <option value="">Destinataire…</option>
            {inmates.map((i) => <option key={i.id} value={i.id}>{i.username}</option>)}
          </select>
          <input type="number" step="0.5" min="0.5" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Montant (€)" />
          {parseFloat(amount) > 50 && (
            <div className="text-xs text-amber-400">Ce montant sera automatiquement signalé à l'administration.</div>
          )}
          <button type="submit" disabled={loading || !recipientId || !amount} className="btn btn-primary btn-sm disabled:opacity-50">
            <Send size={14} /> Envoyer
          </button>
        </form>
      </div>

      <div className="card">
        <div className="section-label mb-4">Historique des transferts</div>
        {transfers.length === 0 ? (
          <div className="text-center py-6">
            <ArrowRightLeft size={28} className="text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Aucun transfert</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transfers.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
                <div>
                  <div className="text-sm">{t.description}</div>
                  <div className="text-xs text-slate-500">{timeAgo(t.createdAt)}</div>
                </div>
                <span className={`font-mono font-semibold ${t.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {t.amount >= 0 ? '+' : ''}{formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
