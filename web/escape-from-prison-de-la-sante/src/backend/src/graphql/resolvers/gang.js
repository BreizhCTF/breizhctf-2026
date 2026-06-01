import { requireRole } from '../../middleware/auth.js';

export const GangResolver = {
  leader: async (parent, _, { db }) => {
    if (!parent.leader_id) return null;
    const r = await db.query('SELECT id, username, email, role, created_at FROM users WHERE id = $1', [parent.leader_id]);
    return r.rows[0] || null;
  },
  members: async (parent, _, { db }) => {
    const r = await db.query(
      `SELECT gm.*, u.username, u.id as user_id FROM gang_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.gang_id = $1 ORDER BY gm.role, gm.joined_at`,
      [parent.id]
    );
    return r.rows;
  },
  messages: async (parent, _, { db }) => {
    const r = await db.query(
      'SELECT * FROM gang_messages WHERE gang_id = $1 ORDER BY sent_at DESC LIMIT 50',
      [parent.id]
    );
    return r.rows;
  },
  memberCount: async (parent, _, { db }) => {
    const r = await db.query('SELECT COUNT(*) FROM gang_members WHERE gang_id = $1', [parent.id]);
    return parseInt(r.rows[0].count);
  },
  createdAt: (p) => p.created_at?.toISOString?.() ?? p.created_at,
};

export const GangMemberResolver = {
  user: async (parent, _, { db }) => {
    const r = await db.query('SELECT id, username, email, role, created_at FROM users WHERE id = $1', [parent.user_id]);
    return r.rows[0];
  },
  gang: async (parent, _, { db }) => {
    const r = await db.query('SELECT * FROM gangs WHERE id = $1', [parent.gang_id]);
    return r.rows[0];
  },
  joinedAt: (p) => p.joined_at?.toISOString?.() ?? p.joined_at,
};

export const GangMessageResolver = {
  sender: async (parent, _, { db }) => {
    const r = await db.query('SELECT id, username, email, role, created_at FROM users WHERE id = $1', [parent.sender_id]);
    return r.rows[0];
  },
  sentAt: (p) => p.sent_at?.toISOString?.() ?? p.sent_at,
};

export const gangQueries = {
  gangs: async (_, __, { db, user }) => {
    requireRole(user);
    const r = await db.query('SELECT * FROM gangs ORDER BY name');
    return r.rows;
  },

  myGang: async (_, __, { db, user }) => {
    requireRole(user, 'inmate');
    const membership = await db.query(
      'SELECT gang_id FROM gang_members WHERE user_id = $1', [user.id]
    );
    if (!membership.rows[0]) return null;
    const r = await db.query('SELECT * FROM gangs WHERE id = $1', [membership.rows[0].gang_id]);
    return r.rows[0] || null;
  },

  gangMessages: async (_, { gangId }, { db, user }) => {
    requireRole(user, 'inmate');
    const membership = await db.query(
      'SELECT id FROM gang_members WHERE user_id = $1 AND gang_id = $2', [user.id, gangId]
    );
    if (!membership.rows[0]) throw new Error('Vous ne faites pas partie de ce gang');
    const r = await db.query(
      'SELECT * FROM gang_messages WHERE gang_id = $1 ORDER BY sent_at DESC LIMIT 50', [gangId]
    );
    return r.rows;
  },
};

export const gangMutations = {
  joinGang: async (_, { gangId }, { db, user }) => {
    requireRole(user, 'inmate');
    const existing = await db.query('SELECT id FROM gang_members WHERE user_id = $1', [user.id]);
    if (existing.rows[0]) throw new Error('Vous faites déjà partie d\'un gang');
    await db.query(
      'INSERT INTO gang_members (gang_id, user_id, role) VALUES ($1, $2, $3)',
      [gangId, user.id, 'member']
    );
    await db.query(
      'UPDATE inmate_profiles SET reputation_score = LEAST(100, reputation_score + 5) WHERE user_id = $1',
      [user.id]
    );
    const r = await db.query('SELECT * FROM gangs WHERE id = $1', [gangId]);
    return r.rows[0];
  },

  leaveGang: async (_, __, { db, user }) => {
    requireRole(user, 'inmate');
    const membership = await db.query(
      'SELECT gang_id FROM gang_members WHERE user_id = $1', [user.id]
    );
    if (!membership.rows[0]) throw new Error('Vous ne faites pas partie d\'un gang');
    await db.query('DELETE FROM gang_members WHERE user_id = $1', [user.id]);
    await db.query(
      'UPDATE inmate_profiles SET reputation_score = GREATEST(0, reputation_score - 3) WHERE user_id = $1',
      [user.id]
    );
    return true;
  },

  sendGangMessage: async (_, { gangId, content }, { db, user }) => {
    requireRole(user, 'inmate');
    const membership = await db.query(
      'SELECT id FROM gang_members WHERE user_id = $1 AND gang_id = $2', [user.id, gangId]
    );
    if (!membership.rows[0]) throw new Error('Vous ne faites pas partie de ce gang');
    const r = await db.query(
      'INSERT INTO gang_messages (gang_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *',
      [gangId, user.id, content]
    );
    return r.rows[0];
  },
};
