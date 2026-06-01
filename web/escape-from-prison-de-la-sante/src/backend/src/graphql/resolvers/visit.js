import { requireRole } from '../../middleware/auth.js';

export const VisitRequestResolver = {
  inmate: async (parent, _, { db }) => {
    const result = await db.query('SELECT id, username, email, role, created_at FROM users WHERE id = $1', [parent.inmate_id]);
    return result.rows[0];
  },
  visitorName: (parent) => parent.visitor_name,
  visitorRelation: (parent) => parent.visitor_relation,
  visitorPhone: (parent) => parent.visitor_phone,
  requestedDate: (parent) => parent.requested_date?.toISOString?.()?.split('T')[0] ?? parent.requested_date,
  timeSlot: (parent) => parent.time_slot,
  guardNotes: (parent) => parent.guard_notes,
  createdAt: (parent) => parent.created_at?.toISOString?.() ?? parent.created_at,

  parloirSession: async (parent, _, { db }) => {
    const result = await db.query(
      'SELECT * FROM parloir_sessions WHERE visit_request_id = $1',
      [parent.id]
    );
    return result.rows[0] || null;
  },
};

export const ParloirSessionResolver = {
  visitRequestId: (parent) => parent.visit_request_id,
  startedAt: (parent) => parent.started_at?.toISOString?.() ?? parent.started_at,
  endedAt: (parent) => parent.ended_at?.toISOString?.() ?? parent.ended_at,
  durationMinutes: (parent) => parent.duration_minutes,
  guardInterrupted: (parent) => parent.guard_interrupted,
  smugglingAttempt: (parent) => parent.smuggling_attempt,

  transcript: (parent) => {
    const t = parent.transcript;
    if (!t) return [];
    return (typeof t === 'string' ? JSON.parse(t) : t).map((line) => ({
      speaker: line.speaker,
      text: line.text,
      timestamp: line.timestamp,
    }));
  },
};

export const visitQueries = {
  myVisitRequests: async (_, __, { db, user }) => {
    requireRole(user, 'inmate');
    const result = await db.query(
      'SELECT * FROM visit_requests WHERE inmate_id = $1 ORDER BY created_at DESC',
      [user.id]
    );
    return result.rows;
  },

  parloirSession: async (_, { visitId }, { db, user }) => {
    requireRole(user);
    const result = await db.query(
      `SELECT ps.* FROM parloir_sessions ps
       JOIN visit_requests vr ON vr.id = ps.visit_request_id
       WHERE ps.visit_request_id = $1
         AND ($2 = 'guard' OR $2 = 'director' OR vr.inmate_id = $3)`,
      [visitId, user.role, user.id]
    );
    return result.rows[0] || null;
  },

  visitRequests: async (_, { status }, { db, user }) => {
    requireRole(user, 'guard', 'director');
    let query = 'SELECT * FROM visit_requests WHERE 1=1';
    const params = [];
    if (status) { params.push(status); query += ` AND status = $${params.length}`; }
    query += ' ORDER BY created_at DESC';
    const result = await db.query(query, params);
    return result.rows;
  },
};

export const visitMutations = {
  requestVisit: async (_, { visitorName, visitorRelation, visitorPhone, requestedDate, timeSlot }, { db, user }) => {
    requireRole(user, 'inmate');
    const profile = await db.query(
      'SELECT privileges FROM inmate_profiles WHERE user_id = $1', [user.id]
    );
    const priv = typeof profile.rows[0]?.privileges === 'string'
      ? JSON.parse(profile.rows[0].privileges)
      : profile.rows[0]?.privileges;
    if (!priv?.visits) throw new Error('Les visites sont suspendues pour votre compte');

    const result = await db.query(
      `INSERT INTO visit_requests (inmate_id, visitor_name, visitor_relation, visitor_phone, requested_date, time_slot)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [user.id, visitorName, visitorRelation, visitorPhone, requestedDate, timeSlot]
    );
    return result.rows[0];
  },

  updateVisitRequest: async (_, { id, status, notes }, { db, user }) => {
    requireRole(user, 'guard', 'director');
    const result = await db.query(
      'UPDATE visit_requests SET status=$1, guard_notes=$2 WHERE id=$3 RETURNING *',
      [status, notes || null, id]
    );
    if (!result.rows[0]) throw new Error('Demande introuvable');
    return result.rows[0];
  },

  startParloir: async (_, { visitRequestId }, { db, user }) => {
    requireRole(user, 'guard', 'director');
    const visit = await db.query(
      'SELECT * FROM visit_requests WHERE id=$1 AND status=$2',
      [visitRequestId, 'approved']
    );
    if (!visit.rows[0]) throw new Error('Visite introuvable ou non approuvée');

    const simulatedTranscript = [
      { speaker: 'visitor', text: 'Bonjour. Comment vas-tu ?', timestamp: '00:00' },
      { speaker: 'inmate', text: 'Bien, merci d\'être venu.', timestamp: '00:45' },
      { speaker: 'visitor', text: 'On pense tous à toi. La famille va bien.', timestamp: '01:30' },
      { speaker: 'inmate', text: 'Ça me fait chaud au cœur. Le temps passe lentement ici.', timestamp: '02:15' },
    ];

    const existing = await db.query(
      'SELECT * FROM parloir_sessions WHERE visit_request_id=$1', [visitRequestId]
    );
    if (existing.rows[0]) return existing.rows[0];

    const result = await db.query(
      `INSERT INTO parloir_sessions (visit_request_id, started_at, transcript)
       VALUES ($1, NOW(), $2) RETURNING *`,
      [visitRequestId, JSON.stringify(simulatedTranscript)]
    );
    return result.rows[0];
  },

  interruptParloir: async (_, { parloirId }, { db, user }) => {
    requireRole(user, 'guard', 'director');
    const result = await db.query(
      `UPDATE parloir_sessions
       SET guard_interrupted=TRUE, ended_at=NOW(),
           duration_minutes=EXTRACT(EPOCH FROM (NOW()-started_at))/60
       WHERE id=$1 RETURNING *`,
      [parloirId]
    );
    if (!result.rows[0]) throw new Error('Session introuvable');
    return result.rows[0];
  },

  attemptSmugglingDuringVisit: async (_, { visitId, amount }, { db, user }) => {
    requireRole(user, 'inmate');
    const visit = await db.query(
      `SELECT vr.*, ps.id as parloir_id, ps.smuggling_attempt
       FROM visit_requests vr
       JOIN parloir_sessions ps ON ps.visit_request_id = vr.id
       WHERE vr.id = $1 AND vr.inmate_id = $2 AND vr.status = 'approved'
         AND ps.guard_interrupted = FALSE`,
      [visitId, user.id]
    );
    if (!visit.rows[0]) throw new Error('Visite introuvable ou indisponible');
    if (visit.rows[0].smuggling_attempt) throw new Error('Tentative déjà enregistrée pour cette visite');

    const rate = parseInt(process.env.SMUGGLING_SUCCESS_RATE || '55');
    const success = Math.random() * 100 < rate;

    await db.query(
      `UPDATE parloir_sessions
       SET smuggling_attempt=TRUE, smuggling_success=$1, smuggling_amount=$2
       WHERE id=$3`,
      [success, amount, visit.rows[0].parloir_id]
    );

    if (success) {
      await db.query(
        'UPDATE inmate_profiles SET wallet_balance = wallet_balance + $1 WHERE user_id = $2',
        [amount, user.id]
      );
      await db.query(
        `INSERT INTO wallet_transactions (inmate_id, amount, type, description)
         VALUES ($1, $2, 'family_transfer', 'Transfert via visite familiale')`,
        [user.id, amount]
      );
      return { success: true, amount, conductPenalty: 0, message: 'Transfert réussi.' };
    }

    await db.query(
      'UPDATE inmate_profiles SET conduct_score = GREATEST(0, conduct_score - 10) WHERE user_id = $1',
      [user.id]
    );
    await db.query(
      `INSERT INTO incidents (reporter_id, involved_id, type, description, conduct_penalty)
       VALUES ($1, $2, 'contraband', $3, 10)`,
      [user.id, user.id, `Tentative de passage de fonds lors d'une visite familiale. Montant : ${parseFloat(amount).toFixed(2)}€`]
    );
    return { success: false, amount: null, conductPenalty: 10, message: 'Tentative interceptée. Pénalité de conduite appliquée.' };
  },
};
