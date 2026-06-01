/**
 * Auto-Processor Bot — simulates guard/director activity
 * Processes pending requests after a 15-second delay with random outcomes.
 * Runs every 30 seconds via setInterval.
 */

const DELAY_MS = 15_000; // Only process items older than 15s
const INTERVAL_MS = 30_000;

const directorNotes = [
  'Demande examinée par la direction.',
  'Après analyse du dossier.',
  'Conformément au règlement intérieur.',
  'Avis favorable du comité de discipline.',
  'Refus motivé par le comportement récent.',
  'Le directeur a statué.',
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const chance = (pct) => Math.random() * 100 < pct;

async function processVisitRequests(db) {
  const { rows } = await db.query(
    `SELECT id FROM visit_requests WHERE status='pending' AND created_at < NOW() - INTERVAL '${DELAY_MS / 1000} seconds'`
  );
  for (const row of rows) {
    const approved = chance(70);
    const status = approved ? 'approved' : 'denied';
    const notes = approved ? 'Visite autorisée.' : 'Visite refusée — motif de sécurité.';
    await db.query('UPDATE visit_requests SET status=$1, guard_notes=$2 WHERE id=$3', [status, notes, row.id]);
    console.log(`[bot] visit_request #${row.id} → ${status}`);
  }
}

async function processLeaveRequests(db) {
  const { rows } = await db.query(
    `SELECT id FROM leave_requests WHERE status='pending' AND created_at < NOW() - INTERVAL '${DELAY_MS / 1000} seconds'`
  );
  for (const row of rows) {
    const approved = chance(50);
    const status = approved ? 'approved' : 'denied';
    await db.query('UPDATE leave_requests SET status=$1, director_notes=$2 WHERE id=$3', [status, pick(directorNotes), row.id]);
    console.log(`[bot] leave_request #${row.id} → ${status}`);
  }
}

async function processMail(db) {
  const { rows } = await db.query(
    `SELECT id FROM mail WHERE status='pending' AND created_at < NOW() - INTERVAL '${DELAY_MS / 1000} seconds'`
  );
  for (const row of rows) {
    const delivered = chance(85);
    const status = delivered ? 'delivered' : 'intercepted';
    await db.query('UPDATE mail SET status=$1 WHERE id=$2', [status, row.id]);
    console.log(`[bot] mail #${row.id} → ${status}`);
  }
}

async function processIncidents(db) {
  // open → investigating
  const { rows: openRows } = await db.query(
    `SELECT id FROM incidents WHERE status='open' AND created_at < NOW() - INTERVAL '${DELAY_MS / 1000} seconds'`
  );
  for (const row of openRows) {
    await db.query("UPDATE incidents SET status='investigating' WHERE id=$1", [row.id]);
    console.log(`[bot] incident #${row.id} → investigating`);
  }

  // investigating → resolved (only items already investigating for > 15s)
  const { rows: invRows } = await db.query(
    `SELECT id FROM incidents WHERE status='investigating' AND created_at < NOW() - INTERVAL '${(DELAY_MS * 2) / 1000} seconds'`
  );
  for (const row of invRows) {
    await db.query("UPDATE incidents SET status='resolved' WHERE id=$1", [row.id]);
    console.log(`[bot] incident #${row.id} → resolved`);
  }
}

async function processMedicalRequests(db) {
  // pending → scheduled
  const { rows: pendingRows } = await db.query(
    `SELECT id FROM medical_requests WHERE status='pending' AND created_at < NOW() - INTERVAL '${DELAY_MS / 1000} seconds'`
  );
  for (const row of pendingRows) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    await db.query(
      "UPDATE medical_requests SET status='scheduled', appointment_date=$1, appointment_time='10:00' WHERE id=$2",
      [dateStr, row.id]
    );
    console.log(`[bot] medical_request #${row.id} → scheduled`);
  }

  // scheduled → completed (items scheduled for > 15s)
  const { rows: scheduledRows } = await db.query(
    `SELECT id FROM medical_requests WHERE status='scheduled' AND created_at < NOW() - INTERVAL '${(DELAY_MS * 2) / 1000} seconds'`
  );
  for (const row of scheduledRows) {
    await db.query(
      "UPDATE medical_requests SET status='completed', nurse_notes='Consultation effectuée.', diagnosis='RAS — suivi de routine' WHERE id=$1",
      [row.id]
    );
    console.log(`[bot] medical_request #${row.id} → completed`);
  }
}

async function processExpiredSolitary(db) {
  const { rows } = await db.query(
    `SELECT id, inmate_id FROM solitary_confinements WHERE released_early=FALSE AND ends_at <= NOW()`
  );
  for (const row of rows) {
    await db.query(
      `UPDATE solitary_confinements SET released_early=TRUE, released_at=NOW() WHERE id=$1`,
      [row.id]
    );
    await db.query(
      `UPDATE inmate_profiles SET is_in_solitary=FALSE, privileges='{"yard":true,"library":true,"work":true,"visits":true,"phone":true}' WHERE user_id=$1`,
      [row.inmate_id]
    );
    console.log(`[bot] solitary #${row.id} expired → released inmate #${row.inmate_id}`);
  }
}

export function startAutoProcessor(db) {
  console.log(`[bot] Auto-processor started (every ${INTERVAL_MS / 1000}s, delay ${DELAY_MS / 1000}s)`);

  const tick = async () => {
    try {
      await processVisitRequests(db);
      await processLeaveRequests(db);
      await processMail(db);
      await processIncidents(db);
      await processMedicalRequests(db);
      await processExpiredSolitary(db);
    } catch (err) {
      console.error('[bot] Error:', err.message);
    }
  };

  // First tick after 10s to let the server warm up
  setTimeout(tick, 10_000);
  setInterval(tick, INTERVAL_MS);
}
