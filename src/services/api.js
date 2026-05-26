import axios from 'axios';

const BASE_URL = 'https://api.torn.com/v2';

export const getApiKey = () => localStorage.getItem('tornApiKey') || '';
export const setApiKey = (key) => localStorage.setItem('tornApiKey', key);
export const removeApiKey = () => localStorage.removeItem('tornApiKey');

export const getFactionId = () => localStorage.getItem('tornFactionId') || '';
export const setFactionId = (id) => localStorage.setItem('tornFactionId', id);
export const removeFactionId = () => localStorage.removeItem('tornFactionId');

// ==========================================
// VERCEL PROXY ARCHITECTURE
// ==========================================
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

/**
 * Unified faction data fetcher that completely masks the Faction API Key in production.
 * If running on Vercel, it routes through the backend `api/torn-proxy.js`.
 * If running locally via `npm run dev`, it explicitly uses the frontend LocalStorage key 
 * to preserve Hot Module Reloading without requiring the Vercel CLI daemon.
 */
const fetchFactionCore = async (endpoint, params = {}) => {
  if (IS_LOCAL) {
     const key = getApiKey();
     if (!key) throw new Error("Local Dev Context: Missing API Key.");
     
     const url = `https://api.torn.com${endpoint}`;
     const response = await axios.get(url, {
       params: { ...params, key },
       headers: { 'Authorization': `ApiKey ${key}` }
     });
     
     if (response.data?.error) throw new Error(response.data.error.error || "Local API Error");
     return response.data;
  } else {
     const response = await axios.get('/api/torn-proxy', {
        params: { endpoint, ...params }
     });
     
     if (response.data?.error) throw new Error(response.data.error || response.data.error.error || "Vercel Proxy Error");
     return response.data;
  }
};

// ==========================================
// FACTION ENDPOINTS (PROXIED)
// ==========================================

export const fetchFactionData = async (factionId = '') => {
  const fId = factionId ? `/${factionId}` : '';
  try {
    const d = await fetchFactionCore(`/v2/faction${fId}`, { selections: 'basic,members' });
    return {
      ...d,
      ...(d.basic || {}),
      members: d.members || d.basic?.members || []
    };
  } catch (error) {
    if (error.response?.data?.error) throw new Error(error.response.data.error.error || error.response.data.error.message);
    throw error;
  }
};

export const fetchFactionWarData = async (factionId = '') => {
  const fId = factionId || getFactionId() || '';
  const selections = 'basic,members,attacks,chain,wars,rankedwars,territorywars';
  
  const d = await fetchFactionCore(`/v2/faction/${fId}`, { selections });
  const flat = { ...d };
  if (d.faction) Object.assign(flat, d.faction);
  if (d.basic) Object.assign(flat, d.basic);
  if (d.members) flat.members = d.members;
  if (d.chain) flat.chain = d.chain;
  if (d.attacks) flat.attacks = d.attacks;
  if (d.wars) flat.wars = d.wars;
  if (d.rankedwars) flat.rankedwars = d.rankedwars;
  if (d.territorywars) flat.territorywars = d.territorywars;
  
  return flat;
};

export const fetchFactionActiveWars = async (factionId = '') => {
  const fId = factionId ? `/${factionId}` : '';
  return await fetchFactionCore(`/v2/faction${fId}/wars`);
};

export const fetchFactionArmoryData = async (factionId = '') => {
  const fId = factionId ? `/${factionId}` : '';
  // V1 Endpoint fallback since V2 nested structures are unreliable here
  return await fetchFactionCore(`/faction${fId}`, { selections: 'weapons,armor,medical,drugs,currency' });
};

export const fetchFactionArmoryNews = async (factionId = '') => {
  const fId = factionId ? `/${factionId}` : '';
  const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 86400);
  const d = await fetchFactionCore(`/faction${fId}`, { selections: 'armorynews', from: thirtyDaysAgo });
  return d.armorynews || {};
};

export const fetchRankedWarReport = async (warId) => {
  if (!warId) throw new Error("Missing war ID for ranked war report");
  // V1 Endpoint works perfectly for rankedwarreport selection
  return await fetchFactionCore(`/torn/${warId}`, { selections: 'rankedwarreport' });
};

export const fetchFactionBalances = async (factionId = '') => {
  const fId = factionId ? `/${factionId}` : '';
  return await fetchFactionCore(`/v2/faction${fId}/balance`, { cat: 'all' });
};

export const fetchFactionDepositNews = async (factionId = '') => {
  const fId = factionId ? `/${factionId}` : '';
  return await fetchFactionCore(`/v2/faction${fId}/news`, { striptags: 'true', limit: 100, sort: 'DESC', cat: 'depositFunds' });
};

export const fetchFactionPayoutNews = async (factionId = '') => {
  const fId = factionId ? `/${factionId}` : '';
  return await fetchFactionCore(`/v2/faction${fId}/news`, { striptags: 'true', limit: 100, sort: 'DESC', cat: 'giveFunds' });
};

export const fetchEnemyRoster = async (enemyFactionId) => {
  if (!enemyFactionId) throw new Error("Missing parameters for enemy roster lookup");
  try {
    const d = await fetchFactionCore(`/v2/faction/${enemyFactionId}`, { selections: 'basic,members' });
    return {
      faction: d.basic || d.faction || { id: enemyFactionId, name: 'Unknown Target' },
      members: d.members || {}
    };
  } catch(error) {
    if (error.response?.data?.error) throw new Error(error.response.data.error.error || error.response.data.error.message);
    throw error;
  }
};

export const fetchFactionPastWars = async (factionId = '') => {
  const fId = factionId ? `/${factionId}` : '';
  return await fetchFactionCore(`/v2/faction${fId}/rankedwars`, { offset: 0, limit: 20, sort: 'DESC' });
};


// ==========================================
// USER ENDPOINTS (CLIENT SIDE ONLY)
// ==========================================

export const fetchUserData = async () => {
  const key = getApiKey();
  if (!key) throw new Error("API Key is missing. Please configure it.");
  // Fetch basic profile data that works reliably on v2
  const selections = 'basic,bars,job,faction';

  try {
    const response = await axios.get(`${BASE_URL}/user?selections=${selections}`, {
      headers: { 'Authorization': `ApiKey ${key}` }
    });
    const d = response.data;
    if (d.error) throw new Error(d.error.error || "API Error in User Fetch");

    // v2 returns data at the top level, plus nested objects for some selections
    // Flatten carefully so player_id, name, level, rank, age are always at root
    const basic = d.basic || {};
    const bars  = d.bars  || {};
    const job   = d.job   || d.job_points || {};
    const faction = d.faction || {};

    return {
      ...d,
      ...basic,
      // bars come back nested — hoist them so user.life, user.energy etc work
      life:   bars.life   || d.life,
      energy: bars.energy || d.energy,
      nerve:  bars.nerve  || d.nerve,
      happy:  bars.happy  || d.happy,
      // ensure these are always at root
      player_id: d.player_id || basic.player_id,
      name:      d.name      || basic.name,
      level:     d.level     || basic.level,
      rank:      d.rank      || basic.rank,
      age:       d.age       || basic.age,
      status:    d.status    || basic.status,
      job:  { name: job.company_name || job.name || job.job || 'Unemployed', ...job },
      faction: {
        name:            faction.faction_name || faction.name || 'None',
        position:        faction.position     || 'Member',
        days_in_faction: faction.days_in_faction || 0,
        ...faction
      },
    };
  } catch (error) {
    if (error.response?.data?.error) throw new Error(error.response.data.error.error || error.response.data.error.message);
    throw error;
  }
};

// Sub-endpoints that must use /v2/user/{sub} instead of ?selections=
const V2_SUB_ENDPOINTS = new Set(['personalstats', 'crimes', 'travel', 'attacks', 'battlestats']);

export const fetchUserSpecific = async (selections, additionalParams = '') => {
  const key = getApiKey();
  if (!key) throw new Error("API Key is missing.");
  
  try {
    // Some selections are dedicated sub-endpoints in v2, not ?selections= params
    const firstSel = selections.split(',')[0].trim();
    const url = V2_SUB_ENDPOINTS.has(firstSel)
      ? `${BASE_URL}/user/${firstSel}`
      : `${BASE_URL}/user?selections=${selections}${additionalParams}`;

    const response = await axios.get(url, {
      headers: { 'Authorization': `ApiKey ${key}` }
    });
    const d = response.data;
    if (d.error) throw new Error(d.error.error || "API Error in User Fetch");

    // Flatten any top-level selection key into the root object
    let flattened = { ...d };
    selections.split(',').forEach(sel => { if (d[sel.trim()]) flattened = { ...flattened, ...d[sel.trim()] }; });
    return flattened;
  } catch (error) {
    if (error.response?.data?.error) throw new Error(error.response.data.error.error || error.response.data.error.message);
    throw error;
  }
};

export const fetchAnyUserSpecific = async (userId, selections) => {
  const key = getApiKey();
  if (!key) throw new Error("API Key is missing.");
  if (!userId) throw new Error("Target User ID is missing.");
  
  try {
    const response = await axios.get(`${BASE_URL}/user/${userId}?selections=${selections}`, {
      headers: { 'Authorization': `ApiKey ${key}` }
    });
    const d = response.data;
    if (d.error) throw new Error(d.error.error || "Torn API Error");

    let flattened = { ...d };
    selections.split(',').forEach(sel => { if (d[sel]) flattened = { ...flattened, ...d[sel] }; });
    return flattened;
  } catch(error) {
    if (error.response?.data?.error) throw new Error(error.response.data.error.error || error.response.data.error.message);
    throw error;
  }
};




export const fetchUserCrimes = async () => {
  const key = getApiKey();
  if (!key) throw new Error("API Key is missing.");
  
  try {
    // v2 crimes data lives at the dedicated sub-endpoint /v2/user/crimes
    const r = await axios.get(`${BASE_URL}/user/crimes`, {
      headers: { 'Authorization': `ApiKey ${key}` }
    });
    const d = r.data;
    if (d.error) throw new Error(d.error.error || "API Error fetching crimes");
    
    // Response is { crimes: { CrimeName: {...}, ... } } or crimes at root
    return d.crimes || d;
  } catch (error) {
    if (error.response?.data?.error) throw new Error(error.response.data.error.error || error.response.data.error.message);
    throw error;
  }
};

// ==========================================
// SHARED STATS SYSTEM (Upstash Redis)
// ==========================================

/**
 * Save current user's stats to the backend Redis store.
 * @param {Object} userData - { player_id, name, level, stats }
 */
export const saveUserStats = async (userData) => {
  const key = getApiKey();
  if (!key) throw new Error("API Key is missing.");
  
  const endpoint = IS_LOCAL ? 'http://localhost:3000/api/save-stats' : '/api/save-stats';
  
  const response = await axios.post(endpoint, userData, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `ApiKey ${key}`
    }
  });
  
  if (response.data?.error) throw new Error(response.data.error);
  return response.data;
};

/**
 * Fetch all faction member stats from the backend Redis store.
 * @returns {Promise<{members: Array, configured: boolean}>}
 */
export const getFactionMemberStats = async () => {
  const endpoint = IS_LOCAL ? 'http://localhost:3000/api/get-faction-stats' : '/api/get-faction-stats';
  try {
    const response = await axios.get(endpoint);
    return response.data;
  } catch (error) {
    console.warn('Could not fetch faction member stats:', error.message);
    return { members: [], configured: false };
  }
};
