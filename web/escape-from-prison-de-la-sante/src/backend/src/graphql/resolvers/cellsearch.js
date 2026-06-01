import { requireRole } from '../../middleware/auth.js';

export const cellsearchMutations = {
  performCellSearch: async (_, { inmateId }, { db, user }) => {
    requireRole(user, 'guard', 'director');

    const listings = await db.query(
      'UPDATE black_market_listings SET active = FALSE WHERE seller_id = $1 AND active = TRUE RETURNING *',
      [inmateId]
    );
    const seized = listings.rows.length;

    if (seized > 0) {
      await db.query(
        'UPDATE inmate_profiles SET conduct_score = GREATEST(0, conduct_score - 15), reputation_score = GREATEST(0, reputation_score - 10) WHERE user_id = $1',
        [inmateId]
      );

      await db.query(
        `INSERT INTO incidents (reporter_id, involved_id, type, description, status, conduct_penalty)
         VALUES ($1, $2, 'contraband', $3, 'open', 15)`,
        [user.id, inmateId, `Fouille de cellule : ${seized} annonce(s) de contrebande saisie(s).`]
      );
    }

    return {
      seized,
      message: seized > 0
        ? `Fouille effectuée : ${seized} annonce(s) saisie(s). Incident créé, conduite -15.`
        : 'Fouille effectuée : rien trouvé.',
    };
  },
};
