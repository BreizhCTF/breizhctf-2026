import { Router } from 'express';
import pool from '../config/database.js';

const router = Router();

function requireInternalKey(req, res, next) {
  const key = req.headers['x-internal-key'];
  if (key !== process.env.INTERNAL_API_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  return next();
}

router.use(requireInternalKey);

router.get('/stats', async (req, res) => {
  try {
    const [inmates, inSolitary, openIncidents, pendingVisits, blocs, recentIncidents, workJobs, storeItems] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM inmate_profiles WHERE status='incarcerated'"),
      pool.query("SELECT COUNT(*) FROM inmate_profiles WHERE is_in_solitary=TRUE"),
      pool.query("SELECT COUNT(*) FROM incidents WHERE status='open'"),
      pool.query("SELECT COUNT(*) FROM visit_requests WHERE status='pending'"),
      pool.query(`SELECT id, name, wing, capacity, is_locked as "isLocked", lockdown_reason as "lockdownReason",
                 (SELECT COUNT(*) FROM inmate_profiles WHERE bloc_id=blocs.id) as occupancy FROM blocs`),
      pool.query("SELECT id, type, description, status, conduct_penalty, created_at FROM incidents ORDER BY created_at DESC LIMIT 10"),
      pool.query("SELECT id, name, location, pay_amount as \"payAmount\" FROM work_jobs WHERE active=TRUE ORDER BY name"),
      pool.query("SELECT id, name, category, price FROM store_items WHERE available=TRUE ORDER BY category, name"),
    ]);
    return res.json({
      totalInmates: parseInt(inmates.rows[0].count),
      inSolitary: parseInt(inSolitary.rows[0].count),
      openIncidents: parseInt(openIncidents.rows[0].count),
      pendingVisits: parseInt(pendingVisits.rows[0].count),
      blocs: blocs.rows.map((b) => ({ ...b, occupancy: parseInt(b.occupancy, 10) || 0 })),
      recentIncidents: recentIncidents.rows,
      workJobs: workJobs.rows.map((j) => ({ ...j, payAmount: parseFloat(j.payAmount) })),
      storeItems: storeItems.rows.map((i) => ({ ...i, price: parseFloat(i.price) })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/guards', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, email, created_at FROM users WHERE role='guard' ORDER BY username"
    );
    return res.json(result.rows);
  } catch {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/guards', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Champs requis manquants' });
  }
  try {
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.default.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, 'guard') RETURNING id, username, email",
      [username, email, hash]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Identifiant ou email déjà utilisé' });
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/guards/:id', async (req, res) => {
  try {
    await pool.query("DELETE FROM users WHERE id=$1 AND role='guard'", [req.params.id]);
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/reports', async (req, res) => {
  try {
    const [recent, byType] = await Promise.all([
      pool.query(`
        SELECT i.id, i.type, i.description, i.status, i.conduct_penalty, i.created_at,
               u.username as reporter_name
        FROM incidents i
        JOIN users u ON i.reporter_id=u.id
        ORDER BY i.created_at DESC LIMIT 50
      `),
      pool.query(`SELECT type, COUNT(*) as count FROM incidents GROUP BY type ORDER BY count DESC`),
    ]);
    const incidentsByType = {};
    byType.rows.forEach((r) => { incidentsByType[r.type] = parseInt(r.count); });
    return res.json({ recentIncidents: recent.rows, incidentsByType });
  } catch {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/leave-requests', async (req, res) => {
  const status = req.query.status || 'pending';
  try {
    const result = await pool.query(`
      SELECT lr.*, u.username, ip.prison_number
      FROM leave_requests lr
      JOIN users u ON lr.inmate_id=u.id
      JOIN inmate_profiles ip ON ip.user_id=u.id
      WHERE lr.status=$1
      ORDER BY lr.created_at ASC
    `, [status]);
    return res.json(result.rows);
  } catch {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/leave-requests/:id/decision', async (req, res) => {
  const { approved, notes } = req.body;
  const status = approved === true ? 'approved' : 'denied';
  try {
    await pool.query(
      'UPDATE leave_requests SET status=$1, director_notes=$2 WHERE id=$3',
      [status, notes || null, req.params.id]
    );
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/blocs/:id/lockdown', async (req, res) => {
  const { reason } = req.body;
  try {
    await pool.query(
      'UPDATE blocs SET is_locked=TRUE, lockdown_reason=$1 WHERE id=$2',
      [reason || 'Ordre de la direction', req.params.id]
    );
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/blocs/:id/lockdown', async (req, res) => {
  try {
    await pool.query(
      'UPDATE blocs SET is_locked=FALSE, lockdown_reason=NULL WHERE id=$1',
      [req.params.id]
    );
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.patch('/work-jobs/:id/salary', async (req, res) => {
  const { payAmount } = req.body;
  if (!payAmount || isNaN(payAmount)) return res.status(400).json({ error: 'Montant invalide' });
  try {
    await pool.query('UPDATE work_jobs SET pay_amount=$1 WHERE id=$2', [payAmount, req.params.id]);
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.patch('/store-items/:id/price', async (req, res) => {
  const { price } = req.body;
  if (!price || isNaN(price)) return res.status(400).json({ error: 'Prix invalide' });
  try {
    await pool.query('UPDATE store_items SET price=$1 WHERE id=$2', [price, req.params.id]);
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/inmates/:id/solitary', async (req, res) => {
  const { reason, durationDays, orderedBy } = req.body;
  if (!reason || !durationDays) return res.status(400).json({ error: 'Champs requis manquants' });
  try {
    const endsAt = new Date(Date.now() + durationDays * 86400000);
    await pool.query(`
      INSERT INTO solitary_confinements (inmate_id, reason, ordered_by, ends_at, duration_days)
      VALUES ($1, $2, $3, $4, $5)
    `, [req.params.id, reason, orderedBy || null, endsAt, durationDays]);
    await pool.query(
      'UPDATE inmate_profiles SET is_in_solitary=TRUE, privileges=\'{"yard":false,"library":false,"work":false,"visits":false,"phone":false}\'::jsonb WHERE user_id=$1',
      [req.params.id]
    );
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
