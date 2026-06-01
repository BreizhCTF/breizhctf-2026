import { useQuery } from '@apollo/client';
import { Package } from 'lucide-react';
import { MY_INVENTORY } from '../../graphql/queries';
import { formatDate } from '../../lib/format';

export default function Inventory() {
  const { data, loading } = useQuery(MY_INVENTORY);
  const items = data?.myInventory ?? [];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Mon inventaire</h1>
        <p className="text-slate-400 text-sm mt-1">Articles en votre possession</p>
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm">Chargement…</div>
      ) : items.length === 0 ? (
        <div className="card flex flex-col items-center py-12 text-center">
          <Package size={40} className="text-slate-600 mb-3" />
          <p className="text-slate-400">Votre inventaire est vide</p>
          <p className="text-slate-500 text-sm mt-1">Achetez des articles à la boutique</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((inv) => (
            <div key={inv.id} className="card hover:-translate-y-0.5 transition-transform">
              <div className="mb-3">
                <span className="badge badge-gray text-xs">{inv.item.category}</span>
              </div>
              <h3 className="font-semibold text-sm mb-1">{inv.item.name}</h3>
              <p className="text-slate-400 text-xs mb-3 line-clamp-2">{inv.item.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Acquis le {formatDate(inv.acquiredAt)}</span>
                <span className="badge badge-blue font-mono">×{inv.quantity}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
