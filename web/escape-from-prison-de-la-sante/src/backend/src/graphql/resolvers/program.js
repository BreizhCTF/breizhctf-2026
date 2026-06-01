import { requireRole } from '../../middleware/auth.js';

export const ProgramResolver = {
  totalSessions: (p) => p.total_sessions,
  conductBonus: (p) => p.conduct_bonus,
  requiredForLeave: (p) => p.required_for_leave,
};

export const ProgramEnrollmentResolver = {
  program: async (parent, _, { db }) => {
    const r = await db.query('SELECT * FROM programs WHERE id = $1', [parent.program_id]);
    return r.rows[0];
  },
  inmate: async (parent, _, { db }) => {
    const r = await db.query('SELECT id, username, email, role, created_at FROM users WHERE id = $1', [parent.inmate_id]);
    return r.rows[0];
  },
  sessionsCompleted: (p) => p.sessions_completed,
  enrolledAt: (p) => p.enrolled_at?.toISOString?.() ?? p.enrolled_at,
  completedAt: (p) => p.completed_at?.toISOString?.() ?? p.completed_at,
};

export const programQueries = {
  programs: async (_, __, { db, user }) => {
    requireRole(user);
    const r = await db.query('SELECT * FROM programs ORDER BY name');
    return r.rows;
  },

  myEnrollments: async (_, __, { db, user }) => {
    requireRole(user, 'inmate');
    const r = await db.query(
      `SELECT * FROM program_enrollments WHERE inmate_id = $1 ORDER BY enrolled_at DESC`,
      [user.id]
    );
    return r.rows;
  },
};

export const programMutations = {
  enrollInProgram: async (_, { programId }, { db, user }) => {
    requireRole(user, 'inmate');
    const existing = await db.query(
      'SELECT id FROM program_enrollments WHERE program_id = $1 AND inmate_id = $2 AND status != $3',
      [programId, user.id, 'dropped']
    );
    if (existing.rows[0]) throw new Error('Vous êtes déjà inscrit à ce programme');
    const r = await db.query(
      `INSERT INTO program_enrollments (program_id, inmate_id, status)
       VALUES ($1, $2, 'enrolled') RETURNING *`,
      [programId, user.id]
    );
    return r.rows[0];
  },

  completeSession: async (_, { enrollmentId }, { db, user }) => {
    requireRole(user, 'inmate');
    const enrollment = await db.query(
      'SELECT * FROM program_enrollments WHERE id = $1 AND inmate_id = $2',
      [enrollmentId, user.id]
    );
    if (!enrollment.rows[0]) throw new Error('Inscription introuvable');
    const e = enrollment.rows[0];
    if (e.status === 'completed') throw new Error('Programme déjà terminé');

    const program = await db.query('SELECT * FROM programs WHERE id = $1', [e.program_id]);
    const p = program.rows[0];

    const newCount = e.sessions_completed + 1;
    const isCompleted = newCount >= p.total_sessions;

    await db.query(
      `INSERT INTO program_sessions (enrollment_id, session_number) VALUES ($1, $2)`,
      [enrollmentId, newCount]
    );

    if (isCompleted) {
      await db.query(
        `UPDATE program_enrollments SET sessions_completed = $1, status = 'completed', completed_at = NOW() WHERE id = $2`,
        [newCount, enrollmentId]
      );
      await db.query(
        `UPDATE inmate_profiles SET conduct_score = LEAST(100, conduct_score + $1),
         reputation_score = LEAST(100, reputation_score + 8) WHERE user_id = $2`,
        [p.conduct_bonus, user.id]
      );
    } else {
      await db.query(
        `UPDATE program_enrollments SET sessions_completed = $1, status = 'in_progress' WHERE id = $2`,
        [newCount, enrollmentId]
      );
    }

    const r = await db.query('SELECT * FROM program_enrollments WHERE id = $1', [enrollmentId]);
    return r.rows[0];
  },

  dropProgram: async (_, { enrollmentId }, { db, user }) => {
    requireRole(user, 'inmate');
    await db.query(
      `UPDATE program_enrollments SET status = 'dropped' WHERE id = $1 AND inmate_id = $2`,
      [enrollmentId, user.id]
    );
    return true;
  },
};
