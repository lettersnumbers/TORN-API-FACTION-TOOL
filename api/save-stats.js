/**
 * POST /api/save-stats
 * 
 * Receives a user's personal stats and saves them to Upstash Redis.
 * Verifies the provided API key against Torn before saving.
 * 
 * SETUP REQUIRED:
 * 1. Go to https://vercel.com/integrations/upstash
 * 2. Install the Upstash integration and create a free Redis database
 * 3. Vercel auto-injects UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 * 
 * Request body: { player_id, name, level, stats: { strength, defense, speed, dexterity, total, attacks_won, defends_won } }
 * Header: Authorization: ApiKey <user_key>
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Check Redis is configured — try all common Upstash/KV env var name variants
  // Vercel injects different names depending on the integration prefix setting
  const REDIS_URL =
    process.env.UPSTASH_REDIS_KV_REST_API_URL ||  // actual name Vercel injected
    process.env.UPSTASH_REDIS_REST_URL         ||  // prefix = UPSTASH_REDIS
    process.env.KV_REST_API_URL                ||  // Vercel KV default
    process.env.STORAGE_REST_API_URL           ||  // prefix = STORAGE
    process.env.STORAGE_URL                    ||
    null;

  const REDIS_TOKEN =
    process.env.UPSTASH_REDIS_KV_REST_API_TOKEN || // actual name Vercel injected
    process.env.UPSTASH_REDIS_REST_TOKEN        || // prefix = UPSTASH_REDIS
    process.env.KV_REST_API_TOKEN               || // Vercel KV default
    process.env.STORAGE_REST_API_TOKEN          ||
    process.env.STORAGE_TOKEN                   ||
    null;

  if (!REDIS_URL || !REDIS_TOKEN) {
    const presentVars = Object.keys(process.env).filter(k =>
      k.includes('UPSTASH') || k.includes('REDIS') || k.includes('KV_') || k.includes('STORAGE')
    );
    return res.status(503).json({
      error: 'Redis not configured',
      hint: 'Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN in Vercel Environment Variables',
      env_vars_found: presentVars
    });
  }


  // Extract and verify the user's API key
  const authHeader = req.headers.authorization || '';
  const userKey = authHeader.replace('ApiKey ', '').trim();
  if (!userKey || userKey.length < 10) {
    return res.status(401).json({ error: 'Missing or invalid API key in Authorization header' });
  }

  // Parse body
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { player_id, name, level, stats } = body || {};
  if (!player_id || !name || !stats) {
    return res.status(400).json({ error: 'Missing required fields: player_id, name, stats' });
  }

  // Verify the API key is valid by making a minimal Torn API call (v1, most reliable)
  try {
    const tornRes = await fetch(`https://api.torn.com/user/?selections=basic&key=${userKey}`);
    const tornData = await tornRes.json();
    if (tornData.error) {
      return res.status(401).json({ error: 'Torn API key verification failed', details: tornData.error });
    }
    // Verify the key belongs to the player claiming to share
    const verifiedId = tornData.player_id;
    if (verifiedId && String(verifiedId) !== String(player_id)) {
      return res.status(403).json({
        error: 'API key does not match provided player_id',
        expected: String(player_id),
        got: String(verifiedId)
      });
    }
  } catch (e) {
    return res.status(502).json({ error: 'Could not verify API key with Torn', details: e.message });
  }

  // Save to Redis via REST API (avoids needing @upstash/redis package in edge)
  const record = {
    player_id,
    name,
    level: level || 0,
    lastUpdated: Math.floor(Date.now() / 1000),
    stats: {
      strength: stats.strength || 0,
      defense: stats.defense || 0,
      speed: stats.speed || 0,
      dexterity: stats.dexterity || 0,
      total: stats.total || 0,
      attacks_won: stats.attacks_won || 0,
      defends_won: stats.defends_won || 0,
    }
  };

  try {
    // Upstash Redis REST API: SET key value
    // The value must be a JSON string sent as the request body (plain text)
    const redisKey = `member-stats:${player_id}`;
    const valueToStore = JSON.stringify(record);

    const setRes = await fetch(`${REDIS_URL}/set/${encodeURIComponent(redisKey)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(valueToStore)   // Upstash REST expects the value JSON-encoded as the body
    });

    if (!setRes.ok) {
      const errText = await setRes.text();
      return res.status(502).json({ error: 'Redis write failed', details: errText });
    }

    // Add player_id to an index set for fast retrieval of all members
    const saddRes = await fetch(`${REDIS_URL}/sadd/faction-stats-index/${player_id}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
    });
    if (!saddRes.ok) {
      console.warn('[save-stats] sadd index warning:', await saddRes.text());
    }

    // ── Append to history (for charts) ──────────────────────────────────────
    // Only save a new history entry if the total has actually changed
    const histKey = encodeURIComponent(`member-stats-history:${player_id}`);
    try {
      // Fetch existing history
      const histGetRes = await fetch(`${REDIS_URL}/get/${histKey}`, {
        headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
      });
      const histGetData = await histGetRes.json();
      let history = [];
      if (histGetData.result) {
        let parsed = histGetData.result;
        let iters = 0;
        while (typeof parsed === 'string' && iters < 4) {
          try { parsed = JSON.parse(parsed); } catch { break; }
          iters++;
        }
        if (Array.isArray(parsed)) history = parsed;
      }

      // Build snapshot
      const snapshot = {
        timestamp: record.lastUpdated,
        strength:  record.stats.strength,
        speed:     record.stats.speed,
        defense:   record.stats.defense,
        dexterity: record.stats.dexterity,
        total:     record.stats.total,
      };

      // Only append if stats changed (or first save)
      const last = history[history.length - 1];
      if (!last || last.total !== snapshot.total) {
        history.push(snapshot);
        if (history.length > 100) history = history.slice(-100); // cap at 100 snapshots
        const histValue = JSON.stringify(history);
        await fetch(`${REDIS_URL}/set/${histKey}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(histValue)
        });
      }
    } catch (histErr) {
      console.warn('[save-stats] history write warning:', histErr.message);
      // Non-fatal — main record was already saved
    }

    return res.status(200).json({ success: true, player_id, lastUpdated: record.lastUpdated });
  } catch (e) {
    return res.status(500).json({ error: 'Internal server error', details: e.message });
  }
}
