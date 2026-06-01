import dns from 'node:dns/promises';
import { requireRole } from '../../middleware/auth.js';

const PRIVATE_RANGES = [
  /^0\./,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
];

function isPrivateAddress(addr) {
  return PRIVATE_RANGES.some((re) => re.test(addr));
}

export const ExternalFeedResolver = {
  lastFetched: (parent) => parent.last_fetched?.toISOString?.() ?? parent.last_fetched,
  lastStatus: (parent) => parent.last_status,
  createdAt: (parent) => parent.created_at?.toISOString?.() ?? parent.created_at,
};

export const feedQueries = {
  externalFeeds: async (_, __, { db, user }) => {
    requireRole(user, 'guard', 'director');
    const result = await db.query(
      'SELECT * FROM external_feeds WHERE active=TRUE ORDER BY name',
    );
    return result.rows;
  },
};

export const feedMutations = {
  addExternalFeed: async (_, { name, url, type }, { db, user }) => {
    requireRole(user, 'guard', 'director');

    try {
      new URL(url);
    } catch {
      throw new Error('URL invalide');
    }

    const result = await db.query(
      `INSERT INTO external_feeds (name, url, type, active, created_by)
       VALUES ($1, $2, $3, TRUE, $4) RETURNING *`,
      [name, url, type || 'json', user.id]
    );
    return result.rows[0];
  },

  fetchExternalFeed: async (_, { feedId, activationCode }, { db, user }) => {
    requireRole(user, 'guard', 'director');

    const configResult = await db.query(
      "SELECT value FROM service_config WHERE key='flux_activation_code'"
    );
    const expectedCode = configResult.rows[0]?.value;
    if (!expectedCode || activationCode.toLowerCase() !== expectedCode.toLowerCase()) {
      throw new Error('Code d\'activation invalide');
    }

    const feedResult = await db.query(
      'SELECT * FROM external_feeds WHERE id=$1 AND active=TRUE',
      [feedId]
    );
    const feed = feedResult.rows[0];
    if (!feed) throw new Error('Source introuvable');

    let parsedUrl;
    try {
      parsedUrl = new URL(feed.url);
    } catch {
      return { success: false, error: 'URL de la source invalide' };
    }

    const hostname = parsedUrl.hostname;

    let addresses;
    try {
      addresses = await dns.resolve4(hostname);
    } catch {
      return { success: false, error: 'Résolution DNS échouée' };
    }

    if (addresses.some(isPrivateAddress)) {
      await db.query(
        'UPDATE external_feeds SET last_fetched=NOW(), last_status=403 WHERE id=$1',
        [feedId]
      );
      return { success: false, statusCode: 403, error: 'Accès à cette source non autorisé' };
    }

    try {
      const response = await fetch(feed.url, {
        signal: AbortSignal.timeout(8000),
        redirect: 'error',
        headers: {
          'Accept': 'application/json, application/xml, text/xml, */*',
          'X-Internal-Key': process.env.INTERNAL_API_KEY || '',
        },
      });

      const text = await response.text();
      const preview = text.slice(0, 500);

      await db.query(
        'UPDATE external_feeds SET last_fetched=NOW(), last_status=$1 WHERE id=$2',
        [response.status, feedId]
      );

      return { success: true, statusCode: response.status, preview };
    } catch (err) {
      await db.query(
        'UPDATE external_feeds SET last_fetched=NOW(), last_status=0 WHERE id=$1',
        [feedId]
      );
      return { success: false, error: 'Erreur lors de la récupération de la source' };
    }
  },

  removeExternalFeed: async (_, { feedId }, { db, user }) => {
    requireRole(user, 'guard', 'director');
    const result = await db.query(
      'UPDATE external_feeds SET active=FALSE WHERE id=$1',
      [feedId]
    );
    return result.rowCount > 0;
  },
};
