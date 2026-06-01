import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Home, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { MY_CELL, MY_INVENTORY } from '../../graphql/queries';
import { PLACE_CELL_ITEM, REMOVE_CELL_ITEM } from '../../graphql/mutations';

const SLOTS = [
  { id: 'wall_left', label: 'Mur gauche', x: 5, y: 10, w: 20, h: 50 },
  { id: 'wall_right', label: 'Mur droit', x: 75, y: 10, w: 20, h: 50 },
  { id: 'shelf', label: 'Étagère', x: 30, y: 5, w: 40, h: 20 },
  { id: 'desk', label: 'Bureau', x: 10, y: 65, w: 35, h: 28 },
  { id: 'bed', label: 'Lit', x: 55, y: 65, w: 35, h: 28 },
];

export default function Cell() {
  const { data: cellData, refetch: refetchCell } = useQuery(MY_CELL);
  const { data: invData } = useQuery(MY_INVENTORY);
  const [placeCellItem] = useMutation(PLACE_CELL_ITEM);
  const [removeCellItem] = useMutation(REMOVE_CELL_ITEM);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const cellItems = cellData?.myCell ?? [];
  const inventory = (invData?.myInventory ?? []).filter((i) => i.item.category === 'comfort');

  const itemsBySlot = Object.fromEntries(cellItems.map((ci) => [ci.slot, ci]));

  async function handlePlace(inventoryItemId) {
    if (!selectedSlot) return;
    try {
      await placeCellItem({ variables: { inventoryItemId, slot: selectedSlot } });
      toast.success('Article placé dans votre cellule');
      refetchCell();
      setSelectedSlot(null);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleRemove(cellItemId) {
    try {
      await removeCellItem({ variables: { cellItemId } });
      toast.success('Article retiré');
      refetchCell();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="page-title">Ma cellule</h1>
        <p className="text-slate-400 text-sm mt-1">Personnalisez votre espace de vie</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="section-label mb-4">Disposition de la cellule</div>
          <div className="relative bg-slate-900 rounded-lg overflow-hidden" style={{ paddingTop: '56.25%' }}>
            <div className="absolute inset-0 p-4">
              {SLOTS.map((slot) => {
                const occupied = itemsBySlot[slot.id];
                const isSelected = selectedSlot === slot.id;
                return (
                  <div
                    key={slot.id}
                    className={`absolute rounded-lg border-2 cursor-pointer transition-all flex flex-col items-center justify-center text-center p-1 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500/20'
                        : occupied
                        ? 'border-amber-500/50 bg-amber-500/10'
                        : 'border-slate-600 border-dashed bg-slate-800/50 hover:border-slate-400'
                    }`}
                    style={{
                      left: `${slot.x}%`,
                      top: `${slot.y}%`,
                      width: `${slot.w}%`,
                      height: `${slot.h}%`,
                    }}
                    onClick={() => {
                      if (occupied) return;
                      setSelectedSlot(isSelected ? null : slot.id);
                    }}
                  >
                    {occupied ? (
                      <>
                        <div className="text-xs font-semibold text-amber-300 truncate w-full text-center">
                          {occupied.item.name}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemove(occupied.id); }}
                          className="mt-1 text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </>
                    ) : (
                      <>
                        <Plus size={14} className="text-slate-500 mb-0.5" />
                        <span className="text-xs text-slate-500">{slot.label}</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          {selectedSlot && (
            <p className="text-xs text-blue-400 mt-2 text-center">
              Emplacement sélectionné : <strong>{SLOTS.find((s) => s.id === selectedSlot)?.label}</strong> — choisissez un article ci-contre
            </p>
          )}
        </div>

        <div className="card">
          <div className="section-label mb-4">Articles de confort</div>
          {inventory.length === 0 ? (
            <div className="text-center py-6">
              <Home size={28} className="text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Aucun article de confort</p>
              <p className="text-slate-500 text-xs mt-1">Achetez des articles dans la boutique</p>
            </div>
          ) : (
            <div className="space-y-2">
              {inventory.map((inv) => {
                const alreadyPlaced = cellItems.some((ci) => ci.item.id === inv.item.id);
                return (
                  <div key={inv.id} className={`p-3 rounded-lg transition-colors ${
                    selectedSlot && !alreadyPlaced
                      ? 'bg-slate-700 hover:bg-slate-600 cursor-pointer'
                      : 'bg-slate-700 opacity-60'
                  }`}
                    onClick={() => selectedSlot && !alreadyPlaced && handlePlace(inv.id)}
                  >
                    <div className="text-sm font-medium">{inv.item.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {alreadyPlaced ? '✓ Déjà placé' : selectedSlot ? 'Cliquez pour placer' : 'Sélectionnez un emplacement'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
