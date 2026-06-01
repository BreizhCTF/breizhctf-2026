import { requireRole } from '../../middleware/auth.js';

export const ContrabandItemResolver = {
  basePrice: (p) => parseFloat(p.base_price),
  riskLevel: (p) => p.risk_level,
};

export const BlackMarketListingResolver = {
  seller: async (parent, _, { db }) => {
    const r = await db.query('SELECT id, username, email, role, created_at FROM users WHERE id = $1', [parent.seller_id]);
    return r.rows[0];
  },
  contrabandItem: async (parent, _, { db }) => {
    const r = await db.query('SELECT * FROM contraband_items WHERE id = $1', [parent.contraband_item_id]);
    return r.rows[0];
  },
  createdAt: (p) => p.created_at?.toISOString?.() ?? p.created_at,
};

export const TradeResolver = {
  listing: async (parent, _, { db }) => {
    const r = await db.query('SELECT * FROM black_market_listings WHERE id = $1', [parent.listing_id]);
    return r.rows[0];
  },
  buyer: async (parent, _, { db }) => {
    const r = await db.query('SELECT id, username, email, role, created_at FROM users WHERE id = $1', [parent.buyer_id]);
    return r.rows[0];
  },
  seller: async (parent, _, { db }) => {
    const r = await db.query('SELECT id, username, email, role, created_at FROM users WHERE id = $1', [parent.seller_id]);
    return r.rows[0];
  },
  completedAt: (p) => p.completed_at?.toISOString?.() ?? p.completed_at,
};

export const ContrabandInventoryItemResolver = {
  contrabandItem: async (parent, _, { db }) => {
    const r = await db.query('SELECT * FROM contraband_items WHERE id = $1', [parent.contraband_item_id]);
    return r.rows[0];
  },
  acquiredAt: (p) => p.acquired_at?.toISOString?.() ?? p.acquired_at,
};

export const blackmarketQueries = {
  contrabandItems: async (_, __, { db, user }) => {
    requireRole(user, 'inmate');
    const r = await db.query('SELECT * FROM contraband_items ORDER BY name');
    return r.rows;
  },

  myContrabandInventory: async (_, __, { db, user }) => {
    requireRole(user, 'inmate');
    const r = await db.query(
      'SELECT * FROM contraband_inventory WHERE inmate_id = $1 ORDER BY acquired_at DESC',
      [user.id]
    );
    return r.rows;
  },

  blackMarketListings: async (_, __, { db, user }) => {
    requireRole(user, 'inmate');
    const r = await db.query(
      `SELECT * FROM black_market_listings WHERE active = TRUE ORDER BY created_at DESC`
    );
    return r.rows;
  },

  myTrades: async (_, __, { db, user }) => {
    requireRole(user, 'inmate');
    const r = await db.query(
      `SELECT * FROM trades WHERE buyer_id = $1 OR seller_id = $1 ORDER BY completed_at DESC`,
      [user.id]
    );
    return r.rows;
  },
};

export const blackmarketMutations = {
  createListing: async (_, { contrabandItemId, price, quantity }, { db, user }) => {
    requireRole(user, 'inmate');
    const r = await db.query(
      `INSERT INTO black_market_listings (seller_id, contraband_item_id, price, quantity)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [user.id, contrabandItemId, price, quantity || 1]
    );
    return r.rows[0];
  },

  buyFromBlackMarket: async (_, { listingId }, { db, user }) => {
    requireRole(user, 'inmate');
    const listing = await db.query(
      'SELECT * FROM black_market_listings WHERE id = $1 AND active = TRUE', [listingId]
    );
    if (!listing.rows[0]) throw new Error('Annonce introuvable ou expirée');
    const item = listing.rows[0];
    if (item.seller_id === user.id) throw new Error('Vous ne pouvez pas acheter votre propre annonce');

    const profile = await db.query(
      'SELECT wallet_balance FROM inmate_profiles WHERE user_id = $1', [user.id]
    );
    if (parseFloat(profile.rows[0].wallet_balance) < parseFloat(item.price)) {
      throw new Error('Solde insuffisant');
    }

    const contrabandItem = await db.query(
      'SELECT risk_level, reveals_activation_code FROM contraband_items WHERE id = $1', [item.contraband_item_id]
    );
    const riskLevel = contrabandItem.rows[0]?.risk_level ?? 50;
    const revealCode = contrabandItem.rows[0]?.reveals_activation_code ?? false;
    const detected = Math.random() * 100 < riskLevel;

    await db.query(
      'UPDATE inmate_profiles SET wallet_balance = wallet_balance - $1 WHERE user_id = $2',
      [item.price, user.id]
    );
    await db.query(
      'UPDATE inmate_profiles SET wallet_balance = wallet_balance + $1 WHERE user_id = $2',
      [item.price, item.seller_id]
    );

    await db.query(
      `INSERT INTO wallet_transactions (inmate_id, amount, type, description)
       VALUES ($1, $2, 'black_market', 'Achat marché noir')`,
      [user.id, -item.price]
    );
    await db.query(
      `INSERT INTO wallet_transactions (inmate_id, amount, type, description)
       VALUES ($1, $2, 'black_market', 'Vente marché noir')`,
      [item.seller_id, item.price]
    );

    const trade = await db.query(
      `INSERT INTO trades (listing_id, buyer_id, seller_id, price, detected)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [listingId, user.id, item.seller_id, item.price, detected]
    );

    item.quantity -= 1;
    if (item.quantity <= 0) {
      await db.query('UPDATE black_market_listings SET active = FALSE WHERE id = $1', [listingId]);
    } else {
      await db.query('UPDATE black_market_listings SET quantity = quantity - 1 WHERE id = $1', [listingId]);
    }

    if (detected) {
      await db.query(
        'UPDATE inmate_profiles SET conduct_score = GREATEST(0, conduct_score - 10), reputation_score = GREATEST(0, reputation_score - 10) WHERE user_id = $1',
        [user.id]
      );
      await db.query(
        `INSERT INTO incidents (reporter_id, involved_id, type, description, status, conduct_penalty)
         VALUES ($1, $2, 'contraband', 'Contrebande détectée lors d''une transaction au marché noir', 'open', 10)`,
        [user.id, user.id]
      );
    } else {
      await db.query(
        'UPDATE inmate_profiles SET reputation_score = LEAST(100, reputation_score + 5) WHERE user_id = $1',
        [user.id]
      );
      // Add item to contraband inventory
      await db.query(
        `INSERT INTO contraband_inventory (inmate_id, contraband_item_id, quantity)
         VALUES ($1, $2, 1)
         ON CONFLICT (inmate_id, contraband_item_id) DO UPDATE SET quantity = contraband_inventory.quantity + 1`,
        [user.id, item.contraband_item_id]
      );
    }

    let successMessage = 'Transaction réussie. Réputation +5.';
    if (!detected && revealCode) {
      const cfg = await db.query("SELECT value FROM service_config WHERE key = 'flux_activation_code'");
      const code = cfg.rows[0]?.value;
      if (code) {
        successMessage = `Transaction réussie. Réputation +5. Note confidentielle reçue : ${code}`;
      }
    }

    return {
      trade: trade.rows[0],
      detected,
      message: detected
        ? 'Transaction détectée ! Incident signalé, conduite -10, réputation -10.'
        : successMessage,
    };
  },

  cancelListing: async (_, { listingId }, { db, user }) => {
    requireRole(user, 'inmate');
    const listing = await db.query(
      'SELECT * FROM black_market_listings WHERE id = $1 AND seller_id = $2', [listingId, user.id]
    );
    if (!listing.rows[0]) throw new Error('Annonce introuvable');
    await db.query('UPDATE black_market_listings SET active = FALSE WHERE id = $1', [listingId]);
    return true;
  },
};
