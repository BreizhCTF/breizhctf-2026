import { requireRole } from '../../middleware/auth.js';

export const MailResolver = {
  correspondentName: (p) => p.correspondent_name,
  interceptedBy: async (parent, _, { db }) => {
    if (!parent.intercepted_by) return null;
    const r = await db.query('SELECT id, username, email, role, created_at FROM users WHERE id = $1', [parent.intercepted_by]);
    return r.rows[0] || null;
  },
  inmate: async (parent, _, { db }) => {
    const r = await db.query('SELECT id, username, email, role, created_at FROM users WHERE id = $1', [parent.inmate_id]);
    return r.rows[0];
  },
  createdAt: (p) => p.created_at?.toISOString?.() ?? p.created_at,
};

export const mailQueries = {
  myMail: async (_, { direction }, { db, user }) => {
    requireRole(user, 'inmate');
    let query = 'SELECT * FROM mail WHERE inmate_id = $1';
    const params = [user.id];
    if (direction) {
      params.push(direction);
      query += ` AND direction = $${params.length}`;
    }
    query += ' ORDER BY created_at DESC';
    const r = await db.query(query, params);
    return r.rows;
  },

  allMail: async (_, { status }, { db, user }) => {
    requireRole(user, 'guard', 'director');
    let query = 'SELECT * FROM mail';
    const params = [];
    if (status) {
      params.push(status);
      query += ` WHERE status = $${params.length}`;
    }
    query += ' ORDER BY created_at DESC';
    const r = await db.query(query, params);
    return r.rows;
  },
};

export const mailMutations = {
  sendMail: async (_, { correspondentName, subject, content }, { db, user }) => {
    requireRole(user, 'inmate');
    const r = await db.query(
      `INSERT INTO mail (inmate_id, direction, correspondent_name, subject, content, status)
       VALUES ($1, 'outgoing', $2, $3, $4, 'pending') RETURNING *`,
      [user.id, correspondentName, subject, content]
    );
    return r.rows[0];
  },

  interceptMail: async (_, { mailId }, { db, user }) => {
    requireRole(user, 'guard', 'director');
    await db.query(
      `UPDATE mail SET status = 'intercepted', intercepted_by = $1 WHERE id = $2`,
      [user.id, mailId]
    );
    const r = await db.query('SELECT * FROM mail WHERE id = $1', [mailId]);
    return r.rows[0];
  },

  deliverMail: async (_, { mailId }, { db, user }) => {
    requireRole(user, 'guard', 'director');
    await db.query(
      `UPDATE mail SET status = 'delivered' WHERE id = $1`, [mailId]
    );
    const r = await db.query('SELECT * FROM mail WHERE id = $1', [mailId]);
    return r.rows[0];
  },
};
