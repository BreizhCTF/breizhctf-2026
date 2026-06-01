import { requireRole } from '../../middleware/auth.js';

export const IncidentResolver = {
  reporter: async (parent, _, { db }) => {
    const result = await db.query('SELECT id, username, email, role, created_at FROM users WHERE id=$1', [parent.reporter_id]);
    return result.rows[0];
  },
  involvedInmate: async (parent, _, { db }) => {
    if (!parent.involved_id) return null;
    const result = await db.query('SELECT id, username, email, role, created_at FROM users WHERE id=$1', [parent.involved_id]);
    return result.rows[0];
  },
  conductPenalty: (parent) => parent.conduct_penalty ?? 0,
  createdAt: (parent) => parent.created_at?.toISOString?.() ?? parent.created_at,
};

export const incidentQueries = {
  myIncidents: async (_, __, { db, user }) => {
    requireRole(user, 'inmate');
    const result = await db.query(
      `SELECT * FROM incidents WHERE reporter_id=$1 OR involved_id=$1 ORDER BY created_at DESC`,
      [user.id]
    );
    return result.rows;
  },

  incidents: async (_, { status }, { db, user }) => {
    requireRole(user, 'guard', 'director');
    let query = 'SELECT * FROM incidents WHERE 1=1';
    const params = [];
    if (status) {
      params.push(status);
      query += ` AND status=$${params.length}`;
    }
    query += ' ORDER BY created_at DESC';
    const result = await db.query(query, params);
    return result.rows;
  },
};

export const incidentMutations = {
  createIncident: async (_, { type, description }, { db, user }) => {
    requireRole(user, 'inmate');

    const validTypes = ['safety', 'maintenance', 'medical', 'complaint', 'other'];
    if (!validTypes.includes(type)) throw new Error('Type d\'incident invalide');

    const result = await db.query(
      `INSERT INTO incidents (reporter_id, type, description, status, conduct_penalty)
       VALUES ($1, $2, $3, 'open', 0) RETURNING *`,
      [user.id, type, description]
    );
    return result.rows[0];
  },

  resolveIncident: async (_, { id, status, conductPenalty }, { db, user }) => {
    requireRole(user, 'guard', 'director');

    const validStatuses = ['open', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) throw new Error('Statut invalide');

    const result = await db.query(
      `UPDATE incidents SET status=$1, conduct_penalty=$2, resolved_by=$3 WHERE id=$4 RETURNING *`,
      [status, conductPenalty ?? 0, user.id, id]
    );
    if (!result.rows[0]) throw new Error('Incident introuvable');

    if (conductPenalty && conductPenalty > 0 && result.rows[0].involved_id) {
      await db.query(
        'UPDATE inmate_profiles SET conduct_score = GREATEST(0, conduct_score - $1) WHERE user_id = $2',
        [conductPenalty, result.rows[0].involved_id]
      );
    }

    return result.rows[0];
  },

  adjustConductScore: async (_, { inmateId, delta, reason }, { db, user }) => {
    requireRole(user, 'guard', 'director');

    const result = await db.query(
      `UPDATE inmate_profiles
       SET conduct_score = GREATEST(0, LEAST(100, conduct_score + $1))
       WHERE user_id=$2 RETURNING *`,
      [delta, inmateId]
    );
    if (!result.rows[0]) throw new Error('Détenu introuvable');

    if (delta < 0) {
      await db.query(
        `INSERT INTO incidents (reporter_id, involved_id, type, description, conduct_penalty)
         VALUES ($1, $2, 'other', $3, $4)`,
        [user.id, inmateId, reason, Math.abs(delta)]
      );
    }

    return result.rows[0];
  },
};
