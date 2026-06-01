import { requireRole } from '../../middleware/auth.js';

export const CellItemResolver = {
  item: async (parent, _, { db }) => {
    const result = await db.query('SELECT * FROM store_items WHERE id=$1', [parent.item_id]);
    return result.rows[0];
  },
  placedAt: (parent) => parent.placed_at?.toISOString?.() ?? parent.placed_at,
};

export const cellQueries = {
  myCell: async (_, __, { db, user }) => {
    requireRole(user, 'inmate');
    const result = await db.query(
      `SELECT ci.* FROM cell_items ci WHERE ci.inmate_id=$1`,
      [user.id]
    );
    return result.rows;
  },
};

export const cellMutations = {
  placeCellItem: async (_, { inventoryItemId, slot }, { db, user }) => {
    requireRole(user, 'inmate');

    const validSlots = ['desk', 'bed', 'wall_left', 'wall_right', 'shelf'];
    if (!validSlots.includes(slot)) throw new Error('Emplacement invalide');

    const inv = await db.query(
      'SELECT * FROM inmate_inventory WHERE id=$1 AND inmate_id=$2',
      [inventoryItemId, user.id]
    );
    if (!inv.rows[0]) throw new Error('Article introuvable dans votre inventaire');

    const item = await db.query(
      'SELECT * FROM store_items WHERE id=$1 AND category=$2',
      [inv.rows[0].item_id, 'comfort']
    );
    if (!item.rows[0]) throw new Error('Seuls les articles de confort peuvent être placés en cellule');

    await db.query(
      'DELETE FROM cell_items WHERE inmate_id=$1 AND slot=$2',
      [user.id, slot]
    );

    const result = await db.query(
      `INSERT INTO cell_items (inmate_id, item_id, slot)
       VALUES ($1, $2, $3) RETURNING *`,
      [user.id, inv.rows[0].item_id, slot]
    );
    return result.rows[0];
  },

  removeCellItem: async (_, { cellItemId }, { db, user }) => {
    requireRole(user, 'inmate');
    const result = await db.query(
      'DELETE FROM cell_items WHERE id=$1 AND inmate_id=$2',
      [cellItemId, user.id]
    );
    return result.rowCount > 0;
  },
};
