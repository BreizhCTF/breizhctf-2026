import { requireRole } from '../../middleware/auth.js';

export const MedicalRequestInmateResolver = {
  inmate: async (parent, _, { db }) => {
    if (!parent.inmate_id) return null;
    const result = await db.query('SELECT id, username, email, role, created_at FROM users WHERE id=$1', [parent.inmate_id]);
    return result.rows[0] ?? null;
  },
};

export const MedicalRecordResolver = {
  bloodType: (parent) => parent.blood_type,
  chronicConditions: (parent) => parent.chronic_conditions,
  lastUpdated: (parent) => parent.last_updated?.toISOString?.() ?? parent.last_updated,
};

export const MedicalRequestResolver = {
  appointmentDate: (parent) => parent.appointment_date?.toISOString?.()?.split('T')[0] ?? parent.appointment_date,
  appointmentTime: (parent) => parent.appointment_time,
  nurseNotes: (parent) => parent.nurse_notes,
  createdAt: (parent) => parent.created_at?.toISOString?.() ?? parent.created_at,

  prescriptions: async (parent, _, { db }) => {
    const result = await db.query(
      'SELECT * FROM prescriptions WHERE medical_request_id=$1 ORDER BY start_date',
      [parent.id]
    );
    return result.rows;
  },
};

export const PrescriptionResolver = {
  medicationName: (parent) => parent.medication_name,
  startDate: (parent) => parent.start_date?.toISOString?.()?.split('T')[0] ?? parent.start_date,
  endDate: (parent) => parent.end_date?.toISOString?.()?.split('T')[0] ?? parent.end_date,
};

export const InfirmaryStayResolver = {
  admittedAt: (parent) => parent.admitted_at?.toISOString?.() ?? parent.admitted_at,
  dischargedAt: (parent) => parent.discharged_at?.toISOString?.() ?? parent.discharged_at,
};

export const medicalQueries = {
  myMedicalRequests: async (_, __, { db, user }) => {
    requireRole(user, 'inmate');
    const result = await db.query(
      'SELECT * FROM medical_requests WHERE inmate_id=$1 ORDER BY created_at DESC',
      [user.id]
    );
    return result.rows;
  },

  myActivePrescriptions: async (_, __, { db, user }) => {
    requireRole(user, 'inmate');
    const result = await db.query(
      `SELECT p.* FROM prescriptions p
       JOIN medical_requests mr ON mr.id = p.medical_request_id
       WHERE mr.inmate_id=$1
         AND (p.end_date IS NULL OR p.end_date >= CURRENT_DATE)
       ORDER BY p.start_date DESC`,
      [user.id]
    );
    return result.rows;
  },

  myInfirmaryStays: async (_, __, { db, user }) => {
    requireRole(user, 'inmate');
    const result = await db.query(
      'SELECT * FROM infirmary_stays WHERE inmate_id=$1 ORDER BY admitted_at DESC',
      [user.id]
    );
    return result.rows;
  },

  medicalRequests: async (_, { status }, { db, user }) => {
    requireRole(user, 'guard', 'director');
    let query = 'SELECT * FROM medical_requests WHERE 1=1';
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

export const medicalMutations = {
  createMedicalRequest: async (_, { symptoms, urgency }, { db, user }) => {
    requireRole(user, 'inmate');

    const validUrgencies = ['standard', 'urgent', 'emergency'];
    const level = urgency && validUrgencies.includes(urgency) ? urgency : 'standard';

    const result = await db.query(
      `INSERT INTO medical_requests (inmate_id, symptoms, urgency, status)
       VALUES ($1, $2, $3, 'pending') RETURNING *`,
      [user.id, symptoms, level]
    );

    if (level === 'emergency') {
      await db.query(
        `INSERT INTO incidents (reporter_id, involved_id, type, description, conduct_penalty)
         VALUES ($1, $1, 'medical', 'Alerte médicale déclenchée par le détenu. Urgence absolue.', 0)`,
        [user.id]
      );
    }

    return result.rows[0];
  },

  createEmergencyAlert: async (_, __, { db, user }) => {
    requireRole(user, 'inmate');

    const result = await db.query(
      `INSERT INTO medical_requests (inmate_id, symptoms, urgency, status)
       VALUES ($1, 'Alerte médicale déclenchée en urgence absolue.', 'emergency', 'pending') RETURNING *`,
      [user.id]
    );

    await db.query(
      `INSERT INTO incidents (reporter_id, involved_id, type, description, conduct_penalty)
       VALUES ($1, $1, 'medical', 'Urgence médicale absolue — intervention immédiate requise.', 0)`,
      [user.id]
    );

    return result.rows[0];
  },

  scheduleMedicalAppointment: async (_, { requestId, date, time }, { db, user }) => {
    requireRole(user, 'guard', 'director');
    const result = await db.query(
      `UPDATE medical_requests
       SET appointment_date=$1, appointment_time=$2, status='scheduled'
       WHERE id=$3 RETURNING *`,
      [date, time, requestId]
    );
    if (!result.rows[0]) throw new Error('Demande introuvable');
    return result.rows[0];
  },

  completeMedicalConsultation: async (_, { requestId, nurseNotes, diagnosis }, { db, user }) => {
    requireRole(user, 'guard', 'director');
    const result = await db.query(
      `UPDATE medical_requests
       SET nurse_notes=$1, diagnosis=$2, status='completed'
       WHERE id=$3 RETURNING *`,
      [nurseNotes, diagnosis || null, requestId]
    );
    if (!result.rows[0]) throw new Error('Demande introuvable');
    return result.rows[0];
  },

  addPrescription: async (_, { requestId, medicationName, dosage, frequency, startDate, endDate }, { db, user }) => {
    requireRole(user, 'guard', 'director');
    const req = await db.query('SELECT inmate_id FROM medical_requests WHERE id=$1', [requestId]);
    if (!req.rows[0]) throw new Error('Demande introuvable');
    const { inmate_id } = req.rows[0];
    const result = await db.query(
      `INSERT INTO prescriptions (inmate_id, medical_request_id, medication_name, dosage, frequency, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [inmate_id, requestId, medicationName, dosage, frequency, startDate, endDate || null]
    );
    return result.rows[0];
  },

  admitToInfirmary: async (_, { inmateId, reason }, { db, user }) => {
    requireRole(user, 'guard', 'director');
    const result = await db.query(
      `INSERT INTO infirmary_stays (inmate_id, reason) VALUES ($1, $2) RETURNING *`,
      [inmateId, reason]
    );
    await db.query(
      `UPDATE inmate_profiles SET status='infirmary' WHERE user_id=$1`,
      [inmateId]
    );
    return result.rows[0];
  },

  dischargeFromInfirmary: async (_, { stayId, notes }, { db, user }) => {
    requireRole(user, 'guard', 'director');
    const result = await db.query(
      `UPDATE infirmary_stays SET discharged_at=NOW(), notes=$1 WHERE id=$2 RETURNING *`,
      [notes || null, stayId]
    );
    if (!result.rows[0]) throw new Error('Séjour introuvable');
    await db.query(
      `UPDATE inmate_profiles SET status='incarcerated' WHERE user_id=$1`,
      [result.rows[0].inmate_id]
    );
    return result.rows[0];
  },
};
