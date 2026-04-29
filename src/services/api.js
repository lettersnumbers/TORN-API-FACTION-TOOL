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
  const selections = 'profile,basic,bars,job,faction';

  try {
    const response = await axios.get(`${BASE_URL}/user?selections=${selections}`, {
      headers: { 'Authorization': `ApiKey ${key}` }
    });
    const d = response.data;
    if (d.error) throw new Error(d.error.error || "API Error in User Fetch");

    return { ...d, ...(d.profile || {}), ...(d.basic || {}), ...(d.bars || {}) };
  } catch (error) {
    if (error.response?.data?.error) throw new Error(error.response.data.error.error || error.response.data.error.message);
    throw error;
  }
};

export const fetchUserSpecific = async (selections, additionalParams = '') => {
  const key = getApiKey();
  if (!key) throw new Error("API Key is missing.");
  
  try {
    const response = await axios.get(`${BASE_URL}/user?selections=${selections}${additionalParams}`, {
      headers: { 'Authorization': `ApiKey ${key}` }
    });
    const d = response.data;
    if (d.error) throw new Error(d.error.error || "API Error in User Fetch");

    let flattened = { ...d };
    selections.split(',').forEach(sel => { if (d[sel]) flattened = { ...flattened, ...d[sel] }; });
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
    const tornRes = await axios.get(`${BASE_URL}/torn/crimes`, { headers: { 'Authorization': `ApiKey ${key}` } });
    const tornD = tornRes.data;
    if (tornD.error) throw new Error(tornD.error.error || "API Error fetching crime list");
    
    const crimeIds = Object.keys(tornD.crimes || {});
    const combined = {};

    for (const crimeId of crimeIds) {
      try {
        const r = await axios.get(`${BASE_URL}/user/${crimeId}/crimes`, { headers: { 'Authorization': `ApiKey ${key}` } });
        const crimeData = r.data.crimes || r.data;
        const mappedName = tornD.crimes[crimeId]?.name || `Crime ${crimeId}`;
        combined[mappedName] = crimeData;
      } catch(e) {
        console.warn(`Could not fetch crime ${crimeId}`, e.message);
      }
      await new Promise(res => setTimeout(res, 200));
    }
    return combined;
  } catch (error) {
    if (error.response?.data?.error) throw new Error(error.response.data.error.error || error.response.data.error.message);
    throw error;
  }
};
