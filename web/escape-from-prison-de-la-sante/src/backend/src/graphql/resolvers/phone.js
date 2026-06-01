import { requireRole } from '../../middleware/auth.js';

export const PhoneCallResolver = {
  contact: async (parent, _, { db }) => {
    const result = await db.query('SELECT * FROM approved_contacts WHERE id=$1', [parent.contact_id]);
    return result.rows[0];
  },
  durationMinutes: (parent) => parent.duration_minutes,
  creditsUsed: (parent) => parent.credits_used,
  calledAt: (parent) => parent.called_at?.toISOString?.() ?? parent.called_at,
};

export const ApprovedContactResolver = {
  contactName: (parent) => parent.contact_name,
  contactPhone: (parent) => parent.contact_phone,
};

export const phoneQueries = {
  myApprovedContacts: async (_, __, { db, user }) => {
    requireRole(user, 'inmate');
    const result = await db.query(
      'SELECT * FROM approved_contacts WHERE inmate_id=$1 ORDER BY contact_name',
      [user.id]
    );
    return result.rows;
  },

  myPhoneCalls: async (_, __, { db, user }) => {
    requireRole(user, 'inmate');
    const result = await db.query(
      'SELECT * FROM phone_calls WHERE caller_id=$1 ORDER BY called_at DESC LIMIT 50',
      [user.id]
    );
    return result.rows;
  },
};

export const phoneMutations = {
  makePhoneCall: async (_, { contactId, durationMinutes }, { db, user }) => {
    requireRole(user, 'inmate');

    const profile = await db.query(
      'SELECT phone_credits, privileges, is_in_solitary FROM inmate_profiles WHERE user_id=$1',
      [user.id]
    );
    const p = profile.rows[0];
    if (!p) throw new Error('Profil introuvable');
    if (p.is_in_solitary) throw new Error('Appels non autorisés en quartier d\'isolement');
    const priv = typeof p.privileges === 'string' ? JSON.parse(p.privileges) : p.privileges;
    if (!priv?.phone) throw new Error('Droits téléphoniques suspendus');

    const contact = await db.query(
      'SELECT * FROM approved_contacts WHERE id=$1 AND inmate_id=$2',
      [contactId, user.id]
    );
    if (!contact.rows[0]) throw new Error('Contact introuvable ou non approuvé');

    const creditsNeeded = Math.max(1, Math.ceil(durationMinutes / 5));
    if (p.phone_credits < creditsNeeded) {
      throw new Error(`Crédits insuffisants. Nécessaire : ${creditsNeeded}, disponible : ${p.phone_credits}`);
    }

    const callNotes = [
      'Échange familial ordinaire, aucun incident signalé.',
      'Conversation calme, nouvelles de la famille.',
      'Appel court, bonne humeur générale.',
      'Discussion sur l\'avancement du dossier judiciaire.',
    ];
    const notes = callNotes[Math.floor(Math.random() * callNotes.length)];

    const result = await db.query(
      `INSERT INTO phone_calls (caller_id, contact_id, duration_minutes, credits_used, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [user.id, contactId, durationMinutes, creditsNeeded, notes]
    );

    await db.query(
      'UPDATE inmate_profiles SET phone_credits=phone_credits-$1 WHERE user_id=$2',
      [creditsNeeded, user.id]
    );

    return result.rows[0];
  },

  approveContact: async (_, { inmateId, contactName, contactPhone, relation }, { db, user }) => {
    requireRole(user, 'guard', 'director');
    const result = await db.query(
      `INSERT INTO approved_contacts (inmate_id, contact_name, contact_phone, relation, approved_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [inmateId, contactName, contactPhone, relation, user.id]
    );
    return result.rows[0];
  },
};
