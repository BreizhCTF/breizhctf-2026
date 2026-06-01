import { requireRole } from '../../middleware/auth.js';

export const transferQueries = {
  myTransfers: async (_, __, { db, user }) => {
    requireRole(user, 'inmate');
    const r = await db.query(
      `SELECT * FROM wallet_transactions
       WHERE (inmate_id = $1 OR recipient_id = $1) AND type = 'transfer'
       ORDER BY created_at DESC`,
      [user.id]
    );
    return r.rows;
  },

  flaggedTransfers: async (_, __, { db, user }) => {
    requireRole(user, 'guard', 'director');
    const r = await db.query(
      `SELECT wt.*, u1.username as sender_name, u2.username as recipient_name
       FROM wallet_transactions wt
       LEFT JOIN users u1 ON wt.inmate_id = u1.id
       LEFT JOIN users u2 ON wt.recipient_id = u2.id
       WHERE wt.flagged = TRUE
       ORDER BY wt.created_at DESC`
    );
    return r.rows;
  },
};

export const transferMutations = {
  transferFunds: async (_, { recipientId, amount }, { db, user }) => {
    requireRole(user, 'inmate');
    if (amount <= 0) throw new Error('Le montant doit être positif');
    if (parseInt(recipientId) === user.id) throw new Error('Vous ne pouvez pas vous transférer des fonds');

    const sender = await db.query(
      'SELECT wallet_balance FROM inmate_profiles WHERE user_id = $1', [user.id]
    );
    if (parseFloat(sender.rows[0].wallet_balance) < amount) {
      throw new Error('Solde insuffisant');
    }

    const recipient = await db.query(
      'SELECT user_id FROM inmate_profiles WHERE user_id = $1', [recipientId]
    );
    if (!recipient.rows[0]) throw new Error('Destinataire introuvable');

    const flagged = amount > 50;

    await db.query(
      'UPDATE inmate_profiles SET wallet_balance = wallet_balance - $1 WHERE user_id = $2',
      [amount, user.id]
    );
    await db.query(
      'UPDATE inmate_profiles SET wallet_balance = wallet_balance + $1 WHERE user_id = $2',
      [amount, recipientId]
    );

    const r1 = await db.query(
      `INSERT INTO wallet_transactions (inmate_id, amount, type, description, flagged, recipient_id)
       VALUES ($1, $2, 'transfer', 'Virement envoyé', $3, $4) RETURNING *`,
      [user.id, -amount, flagged, recipientId]
    );

    await db.query(
      `INSERT INTO wallet_transactions (inmate_id, amount, type, description, flagged, recipient_id)
       VALUES ($1, $2, 'transfer', 'Virement reçu', $3, $4)`,
      [recipientId, amount, flagged, user.id]
    );

    return r1.rows[0];
  },

  flagTransfer: async (_, { transactionId }, { db, user }) => {
    requireRole(user, 'guard', 'director');
    await db.query(
      'UPDATE wallet_transactions SET flagged = TRUE, flagged_by = $1 WHERE id = $2',
      [user.id, transactionId]
    );
    const r = await db.query('SELECT * FROM wallet_transactions WHERE id = $1', [transactionId]);
    return r.rows[0];
  },
};
