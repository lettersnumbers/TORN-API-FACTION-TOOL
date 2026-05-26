/**
 * GET /api/debug-stats
 * 
 * TEMPORARY debug endpoint — remove after troubleshooting.
 * Visit this URL in your browser to test each layer:
 * https://your-vercel-app.vercel.app/api/debug-stats?key=YOUR_API_KEY
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const userKey = req.query.key || '';
  const report = {
    timestamp: new Date().toISOString(),
    redis: { configured: false, url_present: false, token_present: false },
    torn_verification: { attempted: false, success: false, player_id: null, error: null },
    env_keys_present: Object.keys(process.env).filter(k => k.includes('UPSTASH') || k.includes('REDIS')),
  };

  // 1. Check Redis env vars
  const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
  const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
  report.redis.url_present   = !!REDIS_URL;
  report.redis.token_present = !!REDIS_TOKEN;
  report.redis.configured    = !!(REDIS_URL && REDIS_TOKEN);
  if (REDIS_URL) report.redis.url_prefix = REDIS_URL.slice(0, 30) + '...';

  // 2. Try a Redis ping if configured
  if (report.redis.configured) {
    try {
      const pingRes = await fetch(`${REDIS_URL}/ping`, {
        headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
      });
      const pingText = await pingRes.text();
      report.redis.ping_status = pingRes.status;
      report.redis.ping_response = pingText;
      report.redis.reachable = pingRes.ok;
    } catch (e) {
      report.redis.ping_error = e.message;
      report.redis.reachable = false;
    }
  }

  // 3. Verify Torn API key if provided
  if (userKey && userKey.length >= 10) {
    report.torn_verification.attempted = true;
    try {
      const tornRes = await fetch(`https://api.torn.com/user/?selections=basic&key=${userKey}`);
      const tornData = await tornRes.json();
      if (tornData.error) {
        report.torn_verification.error = tornData.error;
      } else {
        report.torn_verification.success = true;
        report.torn_verification.player_id = tornData.player_id;
        report.torn_verification.name = tornData.name;
      }
    } catch (e) {
      report.torn_verification.fetch_error = e.message;
    }
  } else {
    report.torn_verification.note = 'Append ?key=YOUR_API_KEY to test Torn verification';
  }

  return res.status(200).json(report);
}
