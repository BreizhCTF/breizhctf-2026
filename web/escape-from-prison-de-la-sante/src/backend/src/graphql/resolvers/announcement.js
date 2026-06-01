import { requireRole } from '../../middleware/auth.js';

export const AnnouncementResolver = {
  author: async (parent, _, { db }) => {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [parent.author_id]);
    return result.rows[0];
  },

  bloc: async (parent, _, { db }) => {
    if (!parent.bloc_id) return null;
    const result = await db.query(
      `SELECT b.*,
        (SELECT COUNT(*) FROM inmate_profiles ip WHERE ip.bloc_id=b.id AND ip.status='incarcerated') as current_occupancy
       FROM blocs b WHERE b.id = $1`,
      [parent.bloc_id]
    );
    return result.rows[0] || null;
  },

  createdAt: (parent) => parent.created_at?.toISOString?.() ?? parent.created_at,
};

export const announcementQueries = {
  announcements: async (_, { blocId }, { db }) => {
    let query = 'SELECT * FROM announcements WHERE 1=1';
    const params = [];
    if (blocId) {
      params.push(blocId);
      query += ` AND (bloc_id = $${params.length} OR bloc_id IS NULL)`;
    }
    query += ' ORDER BY created_at DESC LIMIT 50';
    const result = await db.query(query, params);
    return result.rows;
  },
};

export const announcementMutations = {
  createAnnouncement: async (_, { title, content, blocId, priority }, { db, user }) => {
    requireRole(user, 'guard', 'director');
    const result = await db.query(
      `INSERT INTO announcements (title, content, author_id, bloc_id, priority)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, content, user.id, blocId || null, priority || 'normal']
    );
    return result.rows[0];
  },
};
