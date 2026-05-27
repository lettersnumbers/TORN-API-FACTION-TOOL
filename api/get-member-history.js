/**
 * GET /api/get-member-history?player_id=xxx
 *
 * Returns the full stat history array for one member.
 * Used by the Faction Battle Stats chart.
 */

const REDIS_URL = () =>
  process.env.UPSTASH_REDIS_KV_REST_API_URL ||
  process.env.UPSTASH_REDIS_REST_URL        ||
  process.env.KV_REST_API_URL               ||
  process.env.STORAGE_REST_API_URL          ||
  null;

const REDIS_TOKEN = () =>
  process.env.UPSTASH_REDIS_KV_REST_API_TOKEN ||
  process.env.UPSTASH_REDIS_REST_TOKEN        ||
  process.env.KV_REST_API_TOKEN               ||
  process.env.STORAGE_REST_API_TOKEN          ||
  null;

function robustParse(val) {
  let parsed = val;
  let i = 0;
  while (typeof parsed === 'string' && i < 4) {
    try { parsed = JSON.parse(parsed); } catch { break; }
    i++;
  }
  return parsed;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url   = REDIS_URL();
  const token = REDIS_TOKEN();
  if (!url || !token) return res.status(200).json({ history: [] });

  const { player_id } = req.query;
  if (!player_id) return res.status(400).json({ error: 'player_id required' });

  try {
    const key = encodeURIComponent(`member-stats-history:${player_id}`);
    const r   = await fetch(`${url}/get/${key}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await r.json();
    if (!data.result) return res.status(200).json({ history: [] });

    const history = robustParse(data.result);
    return res.status(200).json({ history: Array.isArray(history) ? history : [] });
  } catch (e) {
    return res.status(500).json({ error: e.message, history: [] });
  }
}
