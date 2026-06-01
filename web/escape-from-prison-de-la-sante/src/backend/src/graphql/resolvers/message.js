import { requireRole } from '../../middleware/auth.js';

export const DirectMessageResolver = {
  sender: async (parent, _, { db }) => {
    const result = await db.query('SELECT id, username, email, role, created_at FROM users WHERE id=$1', [parent.sender_id]);
    return result.rows[0];
  },
  recipient: async (parent, _, { db }) => {
    const result = await db.query('SELECT id, username, email, role, created_at FROM users WHERE id=$1', [parent.recipient_id]);
    return result.rows[0];
  },
  readAt: (parent) => parent.read_at?.toISOString?.() ?? parent.read_at,
  sentAt: (parent) => parent.sent_at?.toISOString?.() ?? parent.sent_at,
};

export const messageQueries = {
  myMessages: async (_, { contactId }, { db, user }) => {
    requireRole(user, 'inmate');
    let query;
    let params;

    if (contactId) {
      query = `SELECT * FROM direct_messages
               WHERE (sender_id=$1 AND recipient_id=$2)
                  OR (sender_id=$2 AND recipient_id=$1)
               ORDER BY sent_at ASC`;
      params = [user.id, contactId];
    } else {
      query = `SELECT dm.* FROM direct_messages dm
               WHERE dm.sender_id=$1 OR dm.recipient_id=$1
               ORDER BY dm.sent_at DESC`;
      params = [user.id];
    }

    const result = await db.query(query, params);
    return result.rows;
  },
};

export const messageMutations = {
  sendMessage: async (_, { recipientId, content }, { db, user }) => {
    requireRole(user, 'inmate');

    const recipient = await db.query(
      'SELECT id, username, email, role, created_at FROM users WHERE id=$1 AND role=$2',
      [recipientId, 'inmate']
    );
    if (!recipient.rows[0]) throw new Error('Destinataire introuvable');

    const profile = await db.query(
      'SELECT is_in_solitary FROM inmate_profiles WHERE user_id=$1',
      [user.id]
    );
    if (profile.rows[0]?.is_in_solitary) {
      throw new Error('Messagerie non disponible en quartier d\'isolement');
    }

    const result = await db.query(
      `INSERT INTO direct_messages (sender_id, recipient_id, content)
       VALUES ($1, $2, $3) RETURNING *`,
      [user.id, recipientId, content]
    );
    return result.rows[0];
  },

  markMessageRead: async (_, { messageId }, { db, user }) => {
    requireRole(user, 'inmate');
    const result = await db.query(
      `UPDATE direct_messages SET read_at=NOW()
       WHERE id=$1 AND recipient_id=$2 AND read_at IS NULL RETURNING *`,
      [messageId, user.id]
    );
    if (!result.rows[0]) throw new Error('Message introuvable');
    return result.rows[0];
  },
};
