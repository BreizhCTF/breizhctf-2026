import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { ShoppingCart, X, Plus, Minus } from 'lucide-react';
import toast from 'react-hot-toast';
import { STORE_ITEMS, MY_INVENTORY, ME } from '../../graphql/queries';
import { PURCHASE_ITEMS } from '../../graphql/mutations';
import { formatCurrency } from '../../lib/format';

const CATEGORIES = [
  { value: null, label: 'Tout' },
  { value: 'comfort', label: 'Confort' },
  { value: 'food', label: 'Alimentation' },
  { value: 'hygiene', label: 'Hygiène' },
  { value: 'leisure', label: 'Loisirs' },
  { value: 'communication', label: 'Communication' },
];

export default function Store() {
  const [category, setCategory] = useState(null);
  const [cart, setCart] = useState({});
  const { data } = useQuery(STORE_ITEMS, { variables: { category } });
  const [purchaseItems, { loading }] = useMutation(PURCHASE_ITEMS, {
    refetchQueries: [{ query: MY_INVENTORY }, { query: ME }],
  });

  const items = data?.storeItems ?? [];
  const cartItems = Object.entries(cart).filter(([, qty]) => qty > 0);
  const cartTotal = cartItems.reduce((sum, [id, qty]) => {
    const item = items.find((i) => i.id === id);
    return sum + (item ? parseFloat(item.price) * qty : 0);
  }, 0);

  function addToCart(id) {
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  }
  function removeFromCart(id) {
    setCart((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) - 1) }));
  }

  async function handlePurchase() {
    const purchaseList = cartItems.map(([itemId, quantity]) => ({ itemId, quantity }));
    try {
      await purchaseItems({ variables: { items: purchaseList } });
      toast.success('Commande passée avec succès !');
      setCart({});
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Boutique</h1>
        <p className="text-slate-400 text-sm mt-1">Articles disponibles à la cantine pénitentiaire</p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {CATEGORIES.map(({ value, label }) => (
          <button
            key={String(value)}
            onClick={() => setCategory(value)}
            className={`btn btn-sm ${category === value ? 'btn-primary' : 'btn-ghost'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const qty = cart[item.id] || 0;
            return (
              <div key={item.id} className="card flex flex-col">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm">{item.name}</h3>
                    <span className="badge badge-blue font-mono ml-2 flex-shrink-0">
                      {formatCurrency(item.price)}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mb-3">{item.description}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="badge badge-gray">{item.category}</span>
                    <span>Stock : {item.stock}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  {qty === 0 ? (
                    <button
                      onClick={() => addToCart(item.id)}
                      disabled={!item.available || item.stock === 0}
                      className="btn btn-primary btn-sm w-full justify-center disabled:opacity-50"
                    >
                      {item.stock === 0 ? 'Épuisé' : 'Ajouter'}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 w-full justify-between">
                      <button onClick={() => removeFromCart(item.id)} className="btn btn-ghost btn-sm p-1.5">
                        <Minus size={14} />
                      </button>
                      <span className="font-mono font-semibold">{qty}</span>
                      <button onClick={() => addToCart(item.id)} className="btn btn-primary btn-sm p-1.5">
                        <Plus size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {cartItems.length > 0 && (
          <div className="w-72 flex-shrink-0">
            <div className="card sticky top-6">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingCart size={16} />
                <span className="font-semibold">Panier ({cartItems.length})</span>
              </div>

              <div className="space-y-2 mb-4">
                {cartItems.map(([id, qty]) => {
                  const item = items.find((i) => i.id === id);
                  if (!item) return null;
                  return (
                    <div key={id} className="flex items-center justify-between text-sm">
                      <div className="min-w-0">
                        <div className="truncate">{item.name}</div>
                        <div className="text-xs text-slate-400">× {qty}</div>
                      </div>
                      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                        <span className="font-mono text-xs">{formatCurrency(parseFloat(item.price) * qty)}</span>
                        <button
                          onClick={() => setCart((p) => { const n = { ...p }; delete n[id]; return n; })}
                          className="text-slate-500 hover:text-red-400"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-slate-600 pt-3 mb-4">
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="font-mono">{formatCurrency(cartTotal)}</span>
                </div>
              </div>

              <button
                onClick={handlePurchase}
                disabled={loading}
                className="btn btn-primary w-full justify-center disabled:opacity-50"
              >
                {loading ? 'Traitement…' : 'Confirmer la commande'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
