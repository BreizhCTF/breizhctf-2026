import { requireRole } from '../../middleware/auth.js';

export const SolitaryConfinementResolver = {
  inmate: async (parent, _, { db }) => {
    if (!parent.inmate_id) return null;
    const result = await db.query('SELECT id, username, email, role, created_at FROM users WHERE id=$1', [parent.inmate_id]);
    return result.rows[0] ?? null;
  },
  orderedBy: async (parent, _, { db }) => {
    const result = await db.query('SELECT id, username, email, role, created_at FROM users WHERE id=$1', [parent.ordered_by]);
    return result.rows[0];
  },
  startedAt: (parent) => parent.started_at?.toISOString?.() ?? parent.started_at,
  endsAt: (parent) => parent.ends_at?.toISOString?.() ?? parent.ends_at,
  durationDays: (parent) => parent.duration_days,
  releasedEarly: (parent) => parent.released_early,
  releasedAt: (parent) => parent.released_at?.toISOString?.() ?? parent.released_at,
};

export const SolitaryJournalEntryResolver = {
  writtenAt: (parent) => parent.written_at?.toISOString?.() ?? parent.written_at,
};

export const solitaryQueries = {
  mySolitaryJournal: async (_, __, { db, user }) => {
    requireRole(user, 'inmate');
    const result = await db.query(
      'SELECT * FROM solitary_journal_entries WHERE inmate_id=$1 ORDER BY written_at DESC',
      [user.id]
    );
    return result.rows;
  },

  solitaryConfinements: async (_, { active }, { db, user }) => {
    requireRole(user, 'guard', 'director');
    let query = 'SELECT * FROM solitary_confinements WHERE 1=1';
    const params = [];
    if (active === true) {
      query += ' AND released_early=FALSE AND ends_at > NOW()';
    } else if (active === false) {
      query += ' AND (released_early=TRUE OR ends_at <= NOW())';
    }
    query += ' ORDER BY started_at DESC';
    const result = await db.query(query, params);
    return result.rows;
  },
};

export const solitaryMutations = {
  writeSolitaryJournalEntry: async (_, { content }, { db, user }) => {
    requireRole(user, 'inmate');

    // Find active confinement first, fallback to most recent one
    let confinement = await db.query(
      `SELECT id FROM solitary_confinements
       WHERE inmate_id=$1 AND released_early=FALSE AND ends_at > NOW()
       ORDER BY started_at DESC LIMIT 1`,
      [user.id]
    );
    if (!confinement.rows[0]) {
      confinement = await db.query(
        `SELECT id FROM solitary_confinements
         WHERE inmate_id=$1
         ORDER BY started_at DESC LIMIT 1`,
        [user.id]
      );
    }

    const result = await db.query(
      `INSERT INTO solitary_journal_entries (inmate_id, confinement_id, content)
       VALUES ($1, $2, $3) RETURNING *`,
      [user.id, confinement.rows[0]?.id || null, content]
    );
    return result.rows[0];
  },

  placeSolitary: async (_, { inmateId, reason, durationDays }, { db, user }) => {
    requireRole(user, 'guard', 'director');

    if (durationDays < 1 || durationDays > 30) {
      throw new Error('La durée d\'isolement doit être comprise entre 1 et 30 jours');
    }

    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + durationDays);

    const result = await db.query(
      `INSERT INTO solitary_confinements (inmate_id, reason, ordered_by, ends_at, duration_days)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [inmateId, reason, user.id, endsAt, durationDays]
    );

    await db.query(
      `UPDATE inmate_profiles
       SET is_in_solitary=TRUE,
           privileges='{"yard":false,"library":false,"work":false,"visits":false,"phone":false}'
       WHERE user_id=$1`,
      [inmateId]
    );

    return result.rows[0];
  },

  releaseSolitary: async (_, { confinementId }, { db, user }) => {
    requireRole(user, 'guard', 'director');

    const result = await db.query(
      `UPDATE solitary_confinements
       SET released_early=TRUE, released_by=$1, released_at=NOW()
       WHERE id=$2 RETURNING *`,
      [user.id, confinementId]
    );
    if (!result.rows[0]) throw new Error('Mesure d\'isolement introuvable');

    await db.query(
      `UPDATE inmate_profiles
       SET is_in_solitary=FALSE,
           privileges='{"yard":true,"library":true,"work":true,"visits":true,"phone":true}'
       WHERE user_id=$1`,
      [result.rows[0].inmate_id]
    );

    return result.rows[0];
  },
};
