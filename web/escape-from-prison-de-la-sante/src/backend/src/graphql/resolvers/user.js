import { requireRole } from '../../middleware/auth.js';

export const UserResolver = {
  profile: async (parent, _, { db }) => {
    const result = await db.query(
      `SELECT ip.*, b.name as bloc_name, b.wing, b.capacity, b.is_locked, b.lockdown_reason
       FROM inmate_profiles ip
       JOIN blocs b ON ip.bloc_id = b.id
       WHERE ip.user_id = $1`,
      [parent.id]
    );
    return result.rows[0] || null;
  },

  posts: async (parent, _, { db }) => {
    const result = await db.query(
      'SELECT * FROM posts WHERE author_id = $1 ORDER BY created_at DESC',
      [parent.id]
    );
    return result.rows;
  },

  comments: async (parent, _, { db }) => {
    const result = await db.query(
      'SELECT * FROM comments WHERE user_id = $1 ORDER BY created_at DESC',
      [parent.id]
    );
    return result.rows;
  },

  visitRequests: async (parent, _, { db }) => {
    const result = await db.query(
      'SELECT * FROM visit_requests WHERE inmate_id = $1 ORDER BY created_at DESC',
      [parent.id]
    );
    return result.rows;
  },
};

export const InmateProfileResolver = {
  bloc: async (parent, _, { db }) => {
    const result = await db.query(
      `SELECT b.*,
        (SELECT COUNT(*) FROM inmate_profiles ip2 WHERE ip2.bloc_id=b.id AND ip2.status='incarcerated') as current_occupancy
       FROM blocs b WHERE b.id = $1`,
      [parent.bloc_id]
    );
    return result.rows[0];
  },

  privileges: (parent) => {
    const p = typeof parent.privileges === 'string'
      ? JSON.parse(parent.privileges)
      : parent.privileges;
    return {
      yard: p?.yard ?? true,
      library: p?.library ?? true,
      work: p?.work ?? true,
      visits: p?.visits ?? true,
      phone: p?.phone ?? true,
    };
  },

  medicalRecord: async (parent, _, { db }) => {
    const result = await db.query(
      'SELECT * FROM medical_records WHERE inmate_id = $1',
      [parent.user_id]
    );
    return result.rows[0] || null;
  },

  activeSolitary: async (parent, _, { db }) => {
    const result = await db.query(
      `SELECT sc.*, u.username as ordered_by_username
       FROM solitary_confinements sc
       JOIN users u ON sc.ordered_by = u.id
       WHERE sc.inmate_id = $1 AND sc.released_early = FALSE AND sc.ends_at > NOW()
       ORDER BY sc.started_at DESC LIMIT 1`,
      [parent.user_id]
    );
    return result.rows[0] || null;
  },

  prisonNumber: (parent) => parent.prison_number,
  conductScore: (parent) => parent.conduct_score,
  walletBalance: (parent) => parseFloat(parent.wallet_balance),
  phoneCredits: (parent) => parent.phone_credits,
  isInSolitary: (parent) => parent.is_in_solitary,
  reputationScore: (parent) => parent.reputation_score ?? 50,
  entryDate: (parent) => parent.entry_date?.toISOString?.() ?? parent.entry_date,
  releaseDate: (parent) => parent.release_date?.toISOString?.() ?? parent.release_date ?? null,
};

export const userQueries = {
  me: async (_, __, { db, user }) => {
    requireRole(user);
    const result = await db.query('SELECT id, username, email, role, created_at FROM users WHERE id = $1', [user.id]);
    return result.rows[0];
  },

  myProfile: async (_, __, { db, user }) => {
    requireRole(user, 'inmate');
    const result = await db.query(
      'SELECT * FROM inmate_profiles WHERE user_id = $1',
      [user.id]
    );
    if (!result.rows[0]) throw new Error('Profil introuvable');
    return result.rows[0];
  },

  myBloc: async (_, __, { db, user }) => {
    requireRole(user, 'inmate');
    const result = await db.query(
      `SELECT b.*,
        (SELECT COUNT(*) FROM inmate_profiles ip WHERE ip.bloc_id=b.id AND ip.status='incarcerated') as current_occupancy
       FROM blocs b
       JOIN inmate_profiles ip ON ip.bloc_id = b.id
       WHERE ip.user_id = $1`,
      [user.id]
    );
    if (!result.rows[0]) throw new Error('Bloc introuvable');
    return result.rows[0];
  },

  inmatesInBloc: async (_, __, { db, user }) => {
    requireRole(user, 'inmate');
    const result = await db.query(
      `SELECT u.id, u.username, u.email, u.role, u.created_at FROM users u
       JOIN inmate_profiles ip ON ip.user_id = u.id
       WHERE ip.bloc_id = (SELECT bloc_id FROM inmate_profiles WHERE user_id = $1)
         AND u.id != $1
       ORDER BY u.username`,
      [user.id]
    );
    return result.rows;
  },

  users: async (_, { blocId, status }, { db, user }) => {
    requireRole(user, 'guard', 'director');
    let query = `
      SELECT u.id, u.username, u.email, u.role, u.created_at FROM users u
      JOIN inmate_profiles ip ON ip.user_id = u.id
      WHERE u.role = 'inmate'
    `;
    const params = [];
    if (blocId) { params.push(blocId); query += ` AND ip.bloc_id = $${params.length}`; }
    if (status) { params.push(status); query += ` AND ip.status = $${params.length}`; }
    query += ' ORDER BY u.username';
    const result = await db.query(query, params);
    return result.rows;
  },

  user: async (_, { id }, { db, user }) => {
    requireRole(user);
    if (user.role !== 'guard' && user.role !== 'director' && String(user.id) !== String(id)) {
      throw new Error('Accès non autorisé');
    }
    const result = await db.query(
      'SELECT id, username, email, role, created_at FROM users WHERE id = $1',
      [id]
    );
    if (!result.rows[0]) throw new Error('Utilisateur introuvable');
    return result.rows[0];
  },

  allBlocs: async (_, __, { db }) => {
    const result = await db.query(`
      SELECT b.*,
        (SELECT COUNT(*) FROM inmate_profiles ip WHERE ip.bloc_id=b.id AND ip.status='incarcerated') as current_occupancy
      FROM blocs b ORDER BY b.wing
    `);
    return result.rows;
  },
};

export const userMutations = {
  updatePrivileges: async (_, { inmateId, privileges }, { db, user }) => {
    requireRole(user, 'guard', 'director');
    const current = await db.query(
      'SELECT privileges FROM inmate_profiles WHERE user_id = $1', [inmateId]
    );
    const existing = current.rows[0]?.privileges ?? {};
    const merged = { ...existing, ...privileges };
    await db.query(
      'UPDATE inmate_profiles SET privileges = $1 WHERE user_id = $2',
      [JSON.stringify(merged), inmateId]
    );
    const result = await db.query('SELECT * FROM inmate_profiles WHERE user_id = $1', [inmateId]);
    return result.rows[0];
  },

  updateInmateBloc: async (_, { inmateId, blocId }, { db, user }) => {
    requireRole(user, 'guard', 'director');
    await db.query(
      'UPDATE inmate_profiles SET bloc_id = $1 WHERE user_id = $2',
      [blocId, inmateId]
    );
    const result = await db.query('SELECT * FROM inmate_profiles WHERE user_id = $1', [inmateId]);
    return result.rows[0];
  },
};
