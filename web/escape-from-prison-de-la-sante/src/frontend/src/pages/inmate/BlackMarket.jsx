import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { ShoppingBag, Plus, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { BLACK_MARKET_LISTINGS, CONTRABAND_ITEMS, MY_TRADES, MY_CONTRABAND_INVENTORY, ME } from '../../graphql/queries';
import { BUY_FROM_BLACK_MARKET, CREATE_LISTING, CANCEL_LISTING } from '../../graphql/mutations';
import BlackMarketCard from '../../components/BlackMarketCard';
import { formatCurrency } from '../../lib/format';
import { timeAgo } from '../../lib/format';

export default function BlackMarket() {
  const { data: meData } = useQuery(ME);
  const { data: listingsData, refetch } = useQuery(BLACK_MARKET_LISTINGS);
  const { data: itemsData } = useQuery(CONTRABAND_ITEMS);
  const { data: tradesData, refetch: refetchTrades } = useQuery(MY_TRADES);
  const { data: inventoryData, refetch: refetchInventory } = useQuery(MY_CONTRABAND_INVENTORY);
  const [tab, setTab] = useState('browse');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ itemId: '', price: '', quantity: 1 });

  const myId = meData?.me?.id;
  const listings = listingsData?.blackMarketListings ?? [];
  const items = itemsData?.contrabandItems ?? [];
  const trades = tradesData?.myTrades ?? [];
  const inventory = inventoryData?.myContrabandInventory ?? [];

  const [buy] = useMutation(BUY_FROM_BLACK_MARKET, {
    onCompleted: (data) => {
      const r = data.buyFromBlackMarket;
      if (r.detected) toast.error(r.message);
      else toast.success(r.message);
      refetch(); refetchTrades(); refetchInventory();
    },
    onError: (e) => toast.error(e.message),
  });

  const [createListing] = useMutation(CREATE_LISTING, {
    onCompleted: () => { toast.success('Annonce créée'); setShowForm(false); setForm({ itemId: '', price: '', quantity: 1 }); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Marché Noir</h1>
        <p className="text-slate-400 text-sm mt-1">Contrebande entre détenus — attention au risque de détection</p>
      </div>

      <div className="flex gap-2 mb-5">
        {[{ k: 'browse', l: 'Annonces' }, { k: 'stock', l: 'Mon stock' }, { k: 'sell', l: 'Vendre' }, { k: 'history', l: 'Historique' }].map(({ k, l }) => (
          <button key={k} onClick={() => setTab(k)} className={`btn btn-sm ${tab === k ? 'btn-primary' : 'btn-ghost'}`}>{l}</button>
        ))}
      </div>

      {tab === 'browse' && (
        <div className="space-y-4">
          {listings.length === 0 ? (
            <div className="card text-center py-10">
              <ShoppingBag size={32} className="text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Aucune annonce active</p>
            </div>
          ) : (
            listings.map((l) => (
              <BlackMarketCard key={l.id} listing={l} isSelf={l.seller.id === myId} onBuy={(id) => buy({ variables: { listingId: id } })} />
            ))
          )}
        </div>
      )}

      {tab === 'stock' && (
        <div className="space-y-3">
          {inventory.length === 0 ? (
            <div className="card text-center py-10">
              <Package size={32} className="text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Aucun article de contrebande</p>
            </div>
          ) : (
            inventory.map((inv) => (
              <div key={inv.id} className="card flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{inv.contrabandItem.name}</div>
                  <div className="text-xs text-slate-400">{inv.contrabandItem.description}</div>
                  <div className="flex gap-2 mt-1">
                    <span className="badge badge-gray">{inv.contrabandItem.category}</span>
                    <span className={`badge ${inv.contrabandItem.riskLevel > 60 ? 'badge-red' : inv.contrabandItem.riskLevel > 30 ? 'badge-yellow' : 'badge-green'}`}>
                      Risque {inv.contrabandItem.riskLevel}%
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold font-mono">x{inv.quantity}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'sell' && (
        <div className="card">
          <div className="section-label mb-4">Créer une annonce</div>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!form.itemId || !form.price) return;
            createListing({ variables: { contrabandItemId: form.itemId, price: parseFloat(form.price), quantity: parseInt(form.quantity) || 1 } });
          }} className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Article</label>
              <select className="input" value={form.itemId} onChange={(e) => setForm({ ...form, itemId: e.target.value })}>
                <option value="">Sélectionner…</option>
                {items.map((i) => <option key={i.id} value={i.id}>{i.name} — risque {i.riskLevel}%</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Prix (€)</label>
                <input type="number" step="0.5" className="input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Quantité</label>
                <input type="number" min="1" className="input" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-sm"><Plus size={14} /> Publier l'annonce</button>
          </form>
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-3">
          {trades.length === 0 ? (
            <p className="text-slate-400 text-sm">Aucune transaction</p>
          ) : (
            trades.map((t) => (
              <div key={t.id} className="card flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{t.listing?.contrabandItem?.name}</div>
                  <div className="text-xs text-slate-400">
                    {t.buyer.id === myId ? `Acheté à ${t.seller.username}` : `Vendu à ${t.buyer.username}`}
                    <span className="ml-2">{timeAgo(t.completedAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{formatCurrency(t.price)}</span>
                  {t.detected && <span className="badge badge-red">Détecté</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
