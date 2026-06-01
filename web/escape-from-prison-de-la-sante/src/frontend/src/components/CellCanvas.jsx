import { useDraggable, useDroppable } from '@dnd-kit/core';

const SLOT_LABELS = {
  desk:       'Bureau',
  bed:        'Lit',
  wall_left:  'Mur gauche',
  wall_right: 'Mur droit',
  shelf:      'Étagère',
};

const SLOT_POSITIONS = {
  desk:       { top: '30%',  left: '55%', width: 120, height: 70 },
  bed:        { top: '55%',  left: '15%', width: 140, height: 60 },
  wall_left:  { top: '10%',  left: '5%',  width: 100, height: 55 },
  wall_right: { top: '10%',  left: '70%', width: 100, height: 55 },
  shelf:      { top: '10%',  left: '38%', width: 110, height: 50 },
};

const ITEM_EMOJIS = {
  coussin:    '🛏️',
  radio:      '📻',
  lampe:      '💡',
  poster:     '🖼️',
  tapis:      '🟫',
  cartes:     '🃏',
  puzzle:     '🧩',
  livre:      '📚',
  carnet:     '📓',
  default:    '📦',
};

function getEmoji(imageSlug) {
  return ITEM_EMOJIS[imageSlug] ?? ITEM_EMOJIS.default;
}

function DroppableSlot({ slotKey, occupant, onRemove }) {
  const { isOver, setNodeRef } = useDroppable({ id: slotKey });
  const pos = SLOT_POSITIONS[slotKey];

  return (
    <div
      ref={setNodeRef}
      style={{
        position: 'absolute',
        top: pos.top,
        left: pos.left,
        width: pos.width,
        height: pos.height,
        border: `2px ${occupant ? 'solid #3B82F6' : 'dashed #475569'}`,
        borderRadius: 8,
        background: isOver ? 'rgba(59,130,246,0.15)' : occupant ? 'rgba(30,41,59,0.8)' : 'rgba(15,23,42,0.4)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.15s',
        cursor: occupant ? 'default' : 'pointer',
      }}
    >
      {occupant ? (
        <>
          <span style={{ fontSize: 22 }}>{getEmoji(occupant.item?.imageSlug)}</span>
          <span style={{ fontSize: 9, color: '#94A3B8', marginTop: 2, textAlign: 'center', padding: '0 4px' }}>
            {occupant.item?.name}
          </span>
          <button
            onClick={() => onRemove(occupant.id)}
            style={{ fontSize: 9, color: '#EF4444', marginTop: 3, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Retirer
          </button>
        </>
      ) : (
        <>
          <span style={{ fontSize: 18, color: '#475569' }}>+</span>
          <span style={{ fontSize: 9, color: '#475569', marginTop: 2 }}>{SLOT_LABELS[slotKey]}</span>
        </>
      )}
    </div>
  );
}

function DraggableInventoryItem({ item }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: String(item.id) });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        opacity: isDragging ? 0.4 : 1,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        cursor: 'grab',
        padding: '8px 10px',
        background: '#1E293B',
        border: '1px solid #475569',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        userSelect: 'none',
      }}
    >
      <span style={{ fontSize: 18 }}>{getEmoji(item.item?.imageSlug)}</span>
      <div>
        <div style={{ fontSize: 12, color: '#F1F5F9', fontWeight: 600 }}>{item.item?.name}</div>
        <div style={{ fontSize: 10, color: '#64748B' }}>×{item.quantity}</div>
      </div>
    </div>
  );
}

export default function CellCanvas({ cellItems, inventory, onRemove }) {
  const slots = ['desk', 'bed', 'wall_left', 'wall_right', 'shelf'];

  return (
    <div className="flex gap-5">
      <div style={{ position: 'relative', width: 420, height: 280, background: '#0F172A', borderRadius: 12, border: '1px solid #334155', flexShrink: 0 }}>
        {/* Walls outline */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 12, background: 'linear-gradient(135deg, #1E293B22 0%, transparent 100%)' }} />

        {slots.map((slot) => (
          <DroppableSlot
            key={slot}
            slotKey={slot}
            occupant={cellItems.find((ci) => ci.slot === slot)}
            onRemove={onRemove}
          />
        ))}

        {/* Floor label */}
        <div style={{ position: 'absolute', bottom: 8, right: 10, fontSize: 9, color: '#334155', fontFamily: 'DM Mono, monospace', letterSpacing: '0.05em' }}>
          CELLULE
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          Inventaire disponible
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
          {inventory.length === 0 ? (
            <div style={{ fontSize: 12, color: '#475569', textAlign: 'center', padding: 16 }}>
              Aucun article dans l'inventaire
            </div>
          ) : (
            inventory.map((item) => (
              <DraggableInventoryItem key={item.id} item={item} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
