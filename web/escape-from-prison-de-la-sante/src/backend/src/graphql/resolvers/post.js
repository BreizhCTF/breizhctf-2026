import { requireRole } from '../../middleware/auth.js';

export const PostResolver = {
  author: async (parent, _, { db }) => {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [parent.author_id]);
    return result.rows[0];
  },

  bloc: async (parent, _, { db }) => {
    const result = await db.query(
      `SELECT b.*,
        (SELECT COUNT(*) FROM inmate_profiles ip WHERE ip.bloc_id=b.id AND ip.status='incarcerated') as current_occupancy
       FROM blocs b WHERE b.id = $1`,
      [parent.bloc_id]
    );
    return result.rows[0];
  },

  comments: async (parent, _, { db }) => {
    const result = await db.query(
      'SELECT * FROM comments WHERE post_id = $1 ORDER BY created_at ASC',
      [parent.id]
    );
    return result.rows;
  },

  likedByMe: async (parent, _, { db, user }) => {
    if (!user) return false;
    const r = await db.query(
      'SELECT 1 FROM post_likes WHERE post_id=$1 AND user_id=$2',
      [parent.id, user.id]
    );
    return r.rowCount > 0;
  },

  createdAt: (parent) => parent.created_at?.toISOString?.() ?? parent.created_at,
};

export const CommentResolver = {
  user: async (parent, _, { db }) => {
    const result = await db.query('SELECT id, username, email, role, created_at FROM users WHERE id = $1', [parent.user_id]);
    return result.rows[0];
  },

  post: async (parent, _, { db }) => {
    const result = await db.query('SELECT * FROM posts WHERE id = $1', [parent.post_id]);
    return result.rows[0];
  },

  createdAt: (parent) => parent.created_at?.toISOString?.() ?? parent.created_at,
};

export const BlocResolver = {
  currentOccupancy: (parent) => parseInt(parent.current_occupancy ?? 0),
  isLocked: (parent) => parent.is_locked,
  lockdownReason: (parent) => parent.lockdown_reason ?? null,

  inmates: async (parent, _, { db, user }) => {
    if (!user || (user.role !== 'guard' && user.role !== 'director')) return [];
    const result = await db.query(
      `SELECT u.id, u.username, u.email, u.role, u.created_at FROM users u
       JOIN inmate_profiles ip ON ip.user_id = u.id
       WHERE ip.bloc_id = $1 AND ip.status = 'incarcerated'
       ORDER BY u.username`,
      [parent.id]
    );
    return result.rows;
  },

  posts: async (parent, { limit }, { db }) => {
    const result = await db.query(
      `SELECT * FROM posts WHERE bloc_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [parent.id, limit || 30]
    );
    return result.rows;
  },

  announcements: async (parent, _, { db }) => {
    const result = await db.query(
      `SELECT * FROM announcements WHERE bloc_id = $1 OR bloc_id IS NULL ORDER BY created_at DESC LIMIT 10`,
      [parent.id]
    );
    return result.rows;
  },
};

export const postQueries = {
  posts: async (_, { blocId, limit }, { db }) => {
    let query = 'SELECT * FROM posts WHERE 1=1';
    const params = [];
    if (blocId) { params.push(blocId); query += ` AND bloc_id = $${params.length}`; }
    params.push(limit || 50);
    query += ` ORDER BY created_at DESC LIMIT $${params.length}`;
    const result = await db.query(query, params);
    return result.rows;
  },
};

export const postMutations = {
  createPost: async (_, { content, blocId }, { db, user }) => {
    requireRole(user, 'inmate');
    const profile = await db.query(
      `SELECT privileges, is_in_solitary FROM inmate_profiles WHERE user_id = $1`,
      [user.id]
    );
    const p = profile.rows[0];
    if (!p || p.is_in_solitary) throw new Error('Accès à la cour non autorisé');
    const priv = typeof p.privileges === 'string' ? JSON.parse(p.privileges) : p.privileges;
    if (!priv?.yard) throw new Error('Accès à la cour suspendu');

    const result = await db.query(
      'INSERT INTO posts (content, author_id, bloc_id) VALUES ($1, $2, $3) RETURNING *',
      [content, user.id, blocId]
    );
    return result.rows[0];
  },

  likePost: async (_, { postId }, { db, user }) => {
    requireRole(user);
    try {
      await db.query(
        'INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)',
        [postId, user.id]
      );
      await db.query('UPDATE posts SET likes = likes + 1 WHERE id = $1', [postId]);
    } catch {
      await db.query('DELETE FROM post_likes WHERE post_id=$1 AND user_id=$2', [postId, user.id]);
      await db.query('UPDATE posts SET likes = GREATEST(0, likes - 1) WHERE id = $1', [postId]);
    }
    const result = await db.query('SELECT * FROM posts WHERE id = $1', [postId]);
    return result.rows[0];
  },

  createComment: async (_, { content, postId }, { db, user }) => {
    requireRole(user);
    const result = await db.query(
      'INSERT INTO comments (content, user_id, post_id) VALUES ($1, $2, $3) RETURNING *',
      [content, user.id, postId]
    );
    return result.rows[0];
  },
};
