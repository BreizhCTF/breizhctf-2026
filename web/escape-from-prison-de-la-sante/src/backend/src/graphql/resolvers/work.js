import { requireRole } from '../../middleware/auth.js';

export const WorkJobResolver = {
  payAmount: (parent) => parseFloat(parent.pay_amount),
  cooldownMinutes: (parent) => parent.cooldown_minutes,
  slotsAvailable: (parent) => parent.slots_available,

  myLastSession: async (parent, _, { db, user }) => {
    if (!user || user.role !== 'inmate') return null;
    const result = await db.query(
      `SELECT ws.*, wj.name as job_name, wj.pay_amount, wj.cooldown_minutes
       FROM work_sessions ws
       JOIN work_jobs wj ON wj.id = ws.job_id
       WHERE ws.inmate_id = $1 AND ws.job_id = $2
       ORDER BY ws.started_at DESC LIMIT 1`,
      [user.id, parent.id]
    );
    return result.rows[0] || null;
  },
};

export const WorkSessionResolver = {
  job: async (parent, _, { db }) => {
    const result = await db.query('SELECT * FROM work_jobs WHERE id = $1', [parent.job_id]);
    return result.rows[0];
  },
  completedAt: (parent) => parent.completed_at?.toISOString?.() ?? parent.completed_at,
  earnings: (parent) => parseFloat(parent.earnings ?? 0),
};

export const workQueries = {
  workJobs: async (_, __, { db, user }) => {
    requireRole(user, 'inmate');
    const result = await db.query('SELECT * FROM work_jobs WHERE active=TRUE ORDER BY pay_amount ASC');
    return result.rows;
  },
};

export const workMutations = {
  startWork: async (_, { jobId }, { db, user }) => {
    requireRole(user, 'inmate');
    const profile = await db.query(
      'SELECT privileges, is_in_solitary FROM inmate_profiles WHERE user_id=$1', [user.id]
    );
    const p = profile.rows[0];
    if (!p) throw new Error('Profil introuvable');
    if (p.is_in_solitary) throw new Error('Travail non autorisé en quartier d\'isolement');
    const priv = typeof p.privileges === 'string' ? JSON.parse(p.privileges) : p.privileges;
    if (!priv?.work) throw new Error('Accès au travail suspendu');

    const job = await db.query('SELECT * FROM work_jobs WHERE id=$1 AND active=TRUE', [jobId]);
    if (!job.rows[0]) throw new Error('Poste introuvable');

    const lastSession = await db.query(
      `SELECT completed_at FROM work_sessions
       WHERE inmate_id=$1 AND job_id=$2
       ORDER BY started_at DESC LIMIT 1`,
      [user.id, jobId]
    );
    if (lastSession.rows[0]) {
      const completedAt = new Date(lastSession.rows[0].completed_at);
      const cooldownEnd = new Date(completedAt.getTime() + job.rows[0].cooldown_minutes * 60000);
      if (new Date() < cooldownEnd) {
        const remaining = Math.ceil((cooldownEnd - new Date()) / 60000);
        throw new Error(`Cooldown actif. Disponible dans ${remaining} minute(s)`);
      }
    }

    const earnings = parseFloat(job.rows[0].pay_amount);
    const completedAt = new Date();
    const result = await db.query(
      `INSERT INTO work_sessions (inmate_id, job_id, completed_at, earnings, status)
       VALUES ($1, $2, $3, $4, 'completed') RETURNING *`,
      [user.id, jobId, completedAt, earnings]
    );

    await db.query(
      'UPDATE inmate_profiles SET wallet_balance = wallet_balance + $1 WHERE user_id = $2',
      [earnings, user.id]
    );
    await db.query(
      `INSERT INTO wallet_transactions (inmate_id, amount, type, reference_id, description)
       VALUES ($1, $2, 'work', $3, $4)`,
      [user.id, earnings, result.rows[0].id, `Rémunération — ${job.rows[0].name}`]
    );

    return result.rows[0];
  },
};
