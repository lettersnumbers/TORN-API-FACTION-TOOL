import axios from 'axios';

export default async function handler(req, res) {
  // Broad-spectrum CORS acceptance specifically for local dev integration if needed,
  // but natively operates cleanly within Vercel's relative path logic.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: "Method not allowed. Proxy requires GET requests." });
  }

  const { endpoint, ...queryParams } = req.query;

  if (!endpoint) {
    return res.status(400).json({ error: "Missing Target Endpoint String." });
  }

  // Security layer: Hard-block maliciously crafted requests from pinging non-faction objects. 
  // Standard members shouldn't be proxying user endpoints or company data through the leader key.
  if (!endpoint.startsWith('/v2/faction') && !endpoint.startsWith('/faction') && !endpoint.startsWith('/torn')) {
    return res.status(403).json({ error: "Forbidden Axis: Proxy architecture strictly restricted to /faction and /torn endpoints." });
  }

  // Extract the Faction Leader's key directly from Vercel's backend matrix.
  // This file runs entirely on Node servers, ensuring no client ever touches this string.
  const apiKey = process.env.TORN_FACTION_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server Configuration Error: TORN_FACTION_KEY explicitly missing from Vercel core environment." });
  }

  try {
    const baseUrl = `https://api.torn.com${endpoint}`;
    
    // Natively inject the leader's key into all query params simulating typical Torn calls
    const searchParams = new URLSearchParams(queryParams);
    searchParams.append('key', apiKey);
    
    // Natively duplicate key into Authorization headers as requested by Torn V2 architectures
    const headers = {
       'Authorization': `ApiKey ${apiKey}`
    };

    const tornRes = await axios.get(`${baseUrl}?${searchParams.toString()}`, { headers });
    
    return res.status(200).json(tornRes.data);
  } catch (error) {
    console.error("Vercel Proxy Internal Forwarding Error: ", error.response?.data || error.message);
    const code = error.response ? error.response.status : 502;
    return res.status(code).json({ 
       error: "Upstream API Rejection", 
       details: error.response?.data || error.message 
    });
  }
}
