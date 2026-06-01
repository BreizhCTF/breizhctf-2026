import { ShoppingCart } from 'lucide-react';
import { formatCurrency } from '../lib/format';

const CATEGORY_COLORS = {
  comfort:       'text-blue-400',
  food:          'text-amber-400',
  hygiene:       'text-teal-400',
  leisure:       'text-purple-400',
  communication: 'text-green-400',
};

const CATEGORY_LABELS = {
  comfort:       'Confort',
  food:          'Alimentation',
  hygiene:       'Hygiène',
  leisure:       'Loisirs',
  communication: 'Communication',
};

export default function StoreItemCard({ item, quantity, onChangeQuantity, onAdd, balance }) {
  const colorClass = CATEGORY_COLORS[item.category] ?? 'text-slate-400';
  const affordable = balance >= item.price * quantity;

  return (
    <div className={`card hover:-translate-y-0.5 transition-transform ${!item.available || item.stock === 0 ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm leading-tight">{item.name}</h3>
          <span className={`text-xs font-medium ${colorClass}`}>{CATEGORY_LABELS[item.category] ?? item.category}</span>
        </div>
        <div className="text-right ml-3 flex-shrink-0">
          <div className="font-mono font-bold text-amber-400">{formatCurrency(item.price)}</div>
          {item.stock < 10 && item.stock > 0 && (
            <div className="text-xs text-orange-400">Stock : {item.stock}</div>
          )}
        </div>
      </div>

      <p className="text-slate-400 text-xs mb-4 line-clamp-2">{item.description}</p>

      {item.available && item.stock > 0 ? (
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-slate-600 rounded-lg overflow-hidden">
            <button
              onClick={() => onChangeQuantity(Math.max(1, quantity - 1))}
              className="px-2.5 py-1.5 text-slate-400 hover:bg-slate-700 transition-colors text-sm"
            >−</button>
            <span className="px-3 py-1.5 font-mono text-sm min-w-[2rem] text-center">{quantity}</span>
            <button
              onClick={() => onChangeQuantity(quantity + 1)}
              className="px-2.5 py-1.5 text-slate-400 hover:bg-slate-700 transition-colors text-sm"
            >+</button>
          </div>
          <button
            onClick={() => onAdd(item.id, quantity)}
            disabled={!affordable}
            className="btn btn-primary btn-sm flex items-center gap-1.5 flex-1 justify-center disabled:opacity-40"
          >
            <ShoppingCart size={13} />
            {formatCurrency(item.price * quantity)}
          </button>
        </div>
      ) : (
        <div className="text-xs text-slate-500 text-center py-1">Indisponible</div>
      )}
    </div>
  );
}
