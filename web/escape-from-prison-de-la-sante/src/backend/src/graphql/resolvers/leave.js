import { requireRole } from '../../middleware/auth.js';

export const LeaveRequestResolver = {
  inmate: async (parent, _, { db }) => {
    if (!parent.inmate_id) return null;
    const result = await db.query('SELECT id, username, email, role, created_at FROM users WHERE id=$1', [parent.inmate_id]);
    return result.rows[0] ?? null;
  },
  requestedStart: (parent) => parent.requested_start?.toISOString?.()?.split('T')[0] ?? parent.requested_start,
  requestedEnd: (parent) => parent.requested_end?.toISOString?.()?.split('T')[0] ?? parent.requested_end,
  directorNotes: (parent) => parent.director_notes,
  createdAt: (parent) => parent.created_at?.toISOString?.() ?? parent.created_at,
};

export const leaveQueries = {
  myLeaveRequests: async (_, __, { db, user }) => {
    requireRole(user, 'inmate');
    const result = await db.query(
      'SELECT * FROM leave_requests WHERE inmate_id=$1 ORDER BY created_at DESC',
      [user.id]
    );
    return result.rows;
  },

  leaveRequests: async (_, { status }, { db, user }) => {
    requireRole(user, 'guard', 'director');
    let query = 'SELECT * FROM leave_requests WHERE 1=1';
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

export const leaveMutations = {
  createLeaveRequest: async (_, { reason, requestedStart, requestedEnd }, { db, user }) => {
    requireRole(user, 'inmate');

    const profile = await db.query(
      'SELECT conduct_score, is_in_solitary FROM inmate_profiles WHERE user_id=$1',
      [user.id]
    );
    const p = profile.rows[0];
    if (!p) throw new Error('Profil introuvable');
    if (p.is_in_solitary) throw new Error('Demandes de permission non autorisées en quartier d\'isolement');
    if (p.conduct_score < 60) {
      throw new Error('Score de conduite insuffisant pour une permission de sortie (minimum requis : 60/100)');
    }

    const start = new Date(requestedStart);
    const end = new Date(requestedEnd);
    if (end <= start) throw new Error('La date de fin doit être postérieure à la date de début');

    const result = await db.query(
      `INSERT INTO leave_requests (inmate_id, reason, requested_start, requested_end, status)
       VALUES ($1, $2, $3, $4, 'pending') RETURNING *`,
      [user.id, reason, requestedStart, requestedEnd]
    );
    return result.rows[0];
  },

  updateLeaveRequest: async (_, { id, status, notes }, { db, user }) => {
    requireRole(user, 'guard', 'director');
    const result = await db.query(
      `UPDATE leave_requests SET status=$1, director_notes=$2 WHERE id=$3 RETURNING *`,
      [status, notes || null, id]
    );
    if (!result.rows[0]) throw new Error('Demande introuvable');
    return result.rows[0];
  },
};
