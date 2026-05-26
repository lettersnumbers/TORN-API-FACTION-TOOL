/**
 * GET /api/get-faction-stats
 * 
 * Returns all member stats stored in Redis.
 * No authentication required — this is read-only faction member data.
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const REDIS_URL =
    process.env.UPSTASH_REDIS_KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL        ||
    process.env.KV_REST_API_URL               ||
    process.env.STORAGE_REST_API_URL          ||
    process.env.STORAGE_URL                   ||
    null;

  const REDIS_TOKEN =
    process.env.UPSTASH_REDIS_KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN        ||
    process.env.KV_REST_API_TOKEN               ||
    process.env.STORAGE_REST_API_TOKEN          ||
    process.env.STORAGE_TOKEN                   ||
    null;

  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(200).json({ members: [], configured: false });
  }


  try {
    // Get all player IDs from the index set
    const indexRes = await fetch(`${REDIS_URL}/smembers/faction-stats-index`, {
      headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
    });
    const indexData = await indexRes.json();
    const playerIds = indexData.result || [];

    if (!playerIds.length) {
      return res.status(200).json({ members: [], configured: true });
    }

    // Fetch each member's record
    const members = [];
    for (const playerId of playerIds) {
      try {
        const memberRes = await fetch(`${REDIS_URL}/get/${encodeURIComponent(`member-stats:${playerId}`)}`, {
          headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
        });
        const memberData = await memberRes.json();
        if (memberData.result) {
          const parsed = typeof memberData.result === 'string' ? JSON.parse(memberData.result) : memberData.result;
          members.push(parsed);
        }
      } catch (e) {
        // Skip this member if parse fails
        console.warn(`Failed to fetch member ${playerId}:`, e.message);
      }
    }

    // Sort by total stats descending
    members.sort((a, b) => (b.stats?.total || 0) - (a.stats?.total || 0));

    return res.status(200).json({ members, configured: true });
  } catch (e) {
    return res.status(500).json({ error: 'Internal server error', details: e.message });
  }
}
