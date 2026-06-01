import { requireRole } from '../../middleware/auth.js';

export const StoreItemResolver = {
  imageSlug: (parent) => parent.image_slug,
};

export const InventoryItemResolver = {
  item: async (parent, _, { db }) => {
    const result = await db.query('SELECT * FROM store_items WHERE id=$1', [parent.item_id]);
    return result.rows[0];
  },
  acquiredAt: (parent) => parent.acquired_at?.toISOString?.() ?? parent.acquired_at,
};

export const WalletTransactionResolver = {
  createdAt: (parent) => parent.created_at?.toISOString?.() ?? parent.created_at,
};

export const storeQueries = {
  storeItems: async (_, { category }, { db }) => {
    let query = 'SELECT * FROM store_items WHERE available=TRUE';
    const params = [];
    if (category) { params.push(category); query += ` AND category=$${params.length}`; }
    query += ' ORDER BY category, name';
    const result = await db.query(query, params);
    return result.rows;
  },

  myInventory: async (_, __, { db, user }) => {
    requireRole(user, 'inmate');
    const result = await db.query(
      `SELECT ii.* FROM inmate_inventory ii WHERE ii.inmate_id=$1 ORDER BY ii.acquired_at DESC`,
      [user.id]
    );
    return result.rows;
  },

  myWallet: async (_, __, { db, user }) => {
    requireRole(user, 'inmate');
    const result = await db.query(
      'SELECT * FROM wallet_transactions WHERE inmate_id=$1 ORDER BY created_at DESC LIMIT 50',
      [user.id]
    );
    return result.rows;
  },
};

export const storeMutations = {
  purchaseItems: async (_, { items }, { db, user }) => {
    requireRole(user, 'inmate');
    if (!items || items.length === 0) throw new Error('Panier vide');

    const ids = items.map((i) => i.itemId);
    const storeResult = await db.query(
      'SELECT * FROM store_items WHERE id=ANY($1) AND available=TRUE',
      [ids]
    );
    const storeMap = Object.fromEntries(storeResult.rows.map((r) => [r.id, r]));

    let total = 0;
    const orderItems = [];
    for (const item of items) {
      const storeItem = storeMap[item.itemId];
      if (!storeItem) throw new Error(`Article ${item.itemId} introuvable`);
      if (storeItem.stock < item.quantity) throw new Error(`Stock insuffisant pour ${storeItem.name}`);
      const subtotal = parseFloat(storeItem.price) * item.quantity;
      total += subtotal;
      orderItems.push({ item_id: item.itemId, quantity: item.quantity, unit_price: storeItem.price });
    }

    const profile = await db.query(
      'SELECT wallet_balance FROM inmate_profiles WHERE user_id=$1', [user.id]
    );
    if (parseFloat(profile.rows[0].wallet_balance) < total) {
      throw new Error('Solde insuffisant');
    }

    const order = await db.query(
      `INSERT INTO purchase_orders (inmate_id, items, total) VALUES ($1, $2, $3) RETURNING *`,
      [user.id, JSON.stringify(orderItems), total]
    );

    await db.query(
      'UPDATE inmate_profiles SET wallet_balance=wallet_balance-$1 WHERE user_id=$2',
      [total, user.id]
    );
    await db.query(
      `INSERT INTO wallet_transactions (inmate_id, amount, type, reference_id, description)
       VALUES ($1, $2, 'purchase', $3, 'Achat à la boutique')`,
      [user.id, -total, order.rows[0].id]
    );

    for (const item of items) {
      await db.query(
        `INSERT INTO inmate_inventory (inmate_id, item_id, quantity)
         VALUES ($1, $2, $3)
         ON CONFLICT (inmate_id, item_id)
         DO UPDATE SET quantity = inmate_inventory.quantity + EXCLUDED.quantity`,
        [user.id, item.itemId, item.quantity]
      );
      await db.query(
        'UPDATE store_items SET stock=stock-$1 WHERE id=$2',
        [item.quantity, item.itemId]
      );
    }

    const phoneItem = storeResult.rows.find((r) => r.image_slug === 'telephone');
    if (phoneItem) {
      const phoneQty = items
        .filter((i) => String(i.itemId) === String(phoneItem.id))
        .reduce((acc, i) => acc + i.quantity, 0);
      if (phoneQty > 0) {
        await db.query(
          'UPDATE inmate_profiles SET phone_credits = phone_credits + $1 WHERE user_id = $2',
          [phoneQty * 10, user.id]
        );
      }
    }

    return { id: order.rows[0].id, total, status: 'completed', createdAt: order.rows[0].created_at?.toISOString() };
  },
};
