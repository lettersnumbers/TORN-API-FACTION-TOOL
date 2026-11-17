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
  // Use v1 for user profile — it reliably returns player_id, name, level, rank, age
  // v2 user endpoint has inconsistent field nesting depending on selections used
  const V1_URL = 'https://api.torn.com';

  try {
    const response = await axios.get(`${V1_URL}/user/?selections=profile,bars,personalstats`, {
      params: { key }
    });
    const d = response.data;
    if (d.error) throw new Error(d.error.error || "API Error in User Fetch");

    // v1 response: profile fields at root, bars nested under property names
    return {
      ...d,
      // Explicit mapping so UserPage never gets undefined for key fields
      player_id: d.player_id,
      name:      d.name,
      level:     d.level,
      rank:      d.rank,
      age:       d.age,
      status:    d.status,
      // v1 returns life/energy/nerve/happy directly at root as objects
      life:   d.life,
      energy: d.energy,
      nerve:  d.nerve,
      happy:  d.happy,
      // faction & job from profile
      faction: {
        name:            d.faction?.faction_name || d.faction?.name || 'None',
        position:        d.faction?.position     || 'Member',
        days_in_faction: d.faction?.days_in_faction || 0,
        ...(d.faction || {})
      },
      job: {
        name: d.job?.company_name || d.job?.name || d.job?.job || 'Unemployed',
        ...(d.job || {})
      },
    };
  } catch (error) {
    if (error.response?.data?.error) throw new Error(error.response.data.error.error || error.response.data.error.message);
    throw error;
  }
};

// Selections that must use v1 API (not supported as v2 ?selections= or sub-endpoints)
const V1_ONLY_SELECTIONS = new Set(['personalstats', 'crimes', 'travel', 'profile', 'workstats', 'battlestats']);

export const fetchUserSpecific = async (selections, additionalParams = '') => {
  const key = getApiKey();
  if (!key) throw new Error("API Key is missing.");
  
  const V1_URL = 'https://api.torn.com';

  try {
    const firstSel = selections.split(',')[0].trim();
    let response;

    if (V1_ONLY_SELECTIONS.has(firstSel)) {
      // Use v1 API for these selections
      response = await axios.get(`${V1_URL}/user/?selections=${selections}`, {
        params: { key }
      });
    } else {
      // Use v2 API for everything else
      response = await axios.get(`${BASE_URL}/user?selections=${selections}${additionalParams}`, {
        headers: { 'Authorization': `ApiKey ${key}` }
      });
    }

    const d = response.data;
    if (d.error) throw new Error(d.error.error || "API Error in User Fetch");

    // Flatten any top-level selection key into the root object
    let flattened = { ...d };
    selections.split(',').forEach(sel => { const s = sel.trim(); if (d[s] && typeof d[s] === 'object') flattened = { ...flattened, ...d[s] }; });
    return flattened;
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

/**
 * Fetch stat history for a single member from the backend.
 * @param {number|string} player_id
 * @returns {Promise<Array>} Array of { timestamp, strength, speed, defense, dexterity, total }
 */
export const getMemberHistory = async (player_id) => {
  const endpoint = IS_LOCAL
    ? `http://localhost:3000/api/get-member-history?player_id=${player_id}`
    : `/api/get-member-history?player_id=${player_id}`;
  try {
    const response = await axios.get(endpoint);
    return response.data?.history || [];
  } catch {
    return [];
  }
};
