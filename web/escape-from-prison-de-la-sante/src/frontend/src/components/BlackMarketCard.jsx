import DetectionRiskGauge from './DetectionRiskGauge';
import { formatCurrency } from '../lib/format';

export default function BlackMarketCard({ listing, onBuy, isSelf }) {
  const item = listing.contrabandItem;
  return (
    <div className="card">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold">{item.name}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
        </div>
        <span className={`badge ${
          item.category === 'weapon' ? 'badge-red' :
          item.category === 'drug' ? 'badge-orange' :
          item.category === 'electronics' ? 'badge-blue' : 'badge-gray'
        }`}>{item.category}</span>
      </div>
      <div className="mb-3">
        <div className="text-xs text-slate-500 mb-1">Risque de détection</div>
        <DetectionRiskGauge riskLevel={item.riskLevel} />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <span className="font-mono font-bold text-amber-400">{formatCurrency(listing.price)}</span>
          <span className="text-xs text-slate-500 ml-2">× {listing.quantity}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">par {listing.seller.username}</span>
          {!isSelf && onBuy && (
            <button onClick={() => onBuy(listing.id)} className="btn btn-primary btn-sm">
              Acheter
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
