import { useQuery, useMutation } from '@apollo/client';
import { ArrowRightLeft, Flag } from 'lucide-react';
import toast from 'react-hot-toast';
import { FLAGGED_TRANSFERS } from '../../graphql/queries';
import { FLAG_TRANSFER } from '../../graphql/mutations';
import { formatCurrency, timeAgo } from '../../lib/format';

export default function GuardTransfers() {
  const { data, refetch } = useQuery(FLAGGED_TRANSFERS);
  const flaggedTransfers = data?.flaggedTransfers ?? [];

  const [flag] = useMutation(FLAG_TRANSFER, {
    onCompleted: () => { toast.success('Transfert signalé'); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Transferts Suspects</h1>
        <p className="text-slate-400 text-sm mt-1">Transferts signalés automatiquement (montant &gt; 50€)</p>
      </div>

      {flaggedTransfers.length === 0 ? (
        <div className="card text-center py-10">
          <ArrowRightLeft size={32} className="text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">Aucun transfert signalé</p>
        </div>
      ) : (
        <div className="space-y-3">
          {flaggedTransfers.map((t) => (
            <div key={t.id} className="card border-l-4 border-amber-500">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">
                    {t.senderName} → {t.recipientName}
                  </div>
                  <div className="text-xs text-slate-400">
                    {t.description} · {timeAgo(t.createdAt)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-amber-400">{formatCurrency(Math.abs(t.amount))}</span>
                  <span className="badge badge-yellow"><Flag size={10} /> Signalé</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
