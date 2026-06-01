import { requireRole } from '../../middleware/auth.js';

export const PrisonEventResolver = {
  eventTime: (p) => p.event_time,
  eventType: (p) => p.event_type,
  dayOfWeek: (p) => p.day_of_week,
  bloc: async (parent, _, { db }) => {
    if (!parent.bloc_id) return null;
    const r = await db.query('SELECT * FROM blocs WHERE id = $1', [parent.bloc_id]);
    return r.rows[0] || null;
  },
  createdAt: (p) => p.created_at?.toISOString?.() ?? p.created_at,
};

export const EventAttendanceResolver = {
  event: async (parent, _, { db }) => {
    const r = await db.query('SELECT * FROM prison_events WHERE id = $1', [parent.event_id]);
    return r.rows[0];
  },
  inmate: async (parent, _, { db }) => {
    const r = await db.query('SELECT id, username, email, role, created_at FROM users WHERE id = $1', [parent.inmate_id]);
    return r.rows[0];
  },
  markedBy: async (parent, _, { db }) => {
    if (!parent.marked_by) return null;
    const r = await db.query('SELECT id, username, email, role, created_at FROM users WHERE id = $1', [parent.marked_by]);
    return r.rows[0] || null;
  },
  markedAt: (p) => p.marked_at?.toISOString?.() ?? p.marked_at,
};

export const scheduleQueries = {
  prisonEvents: async (_, { eventType }, { db, user }) => {
    requireRole(user);
    let query = 'SELECT * FROM prison_events';
    const params = [];
    if (eventType) {
      params.push(eventType);
      query += ` WHERE event_type = $${params.length}`;
    }
    query += ' ORDER BY event_time';
    const r = await db.query(query, params);
    return r.rows;
  },

  eventAttendance: async (_, { eventId, date }, { db, user }) => {
    requireRole(user, 'guard', 'director');
    const r = await db.query(
      'SELECT * FROM event_attendance WHERE event_id = $1 AND date = $2',
      [eventId, date || new Date().toISOString().split('T')[0]]
    );
    return r.rows;
  },
};

export const scheduleMutations = {
  createPrisonEvent: async (_, { name, description, eventTime, eventType, recurring, dayOfWeek, blocId }, { db, user }) => {
    requireRole(user, 'guard', 'director');
    const r = await db.query(
      `INSERT INTO prison_events (name, description, event_time, event_type, recurring, day_of_week, bloc_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, description, eventTime, eventType, recurring ?? true, dayOfWeek, blocId]
    );
    return r.rows[0];
  },

  markAttendance: async (_, { eventId, inmateId, present, date }, { db, user }) => {
    requireRole(user, 'guard', 'director');
    const d = date || new Date().toISOString().split('T')[0];
    const r = await db.query(
      `INSERT INTO event_attendance (event_id, inmate_id, date, present, marked_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (event_id, inmate_id, date) DO UPDATE SET present = $4, marked_by = $5, marked_at = NOW()
       RETURNING *`,
      [eventId, inmateId, d, present, user.id]
    );
    return r.rows[0];
  },
};
