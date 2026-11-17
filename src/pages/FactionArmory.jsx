import React, { useState, useEffect } from 'react';
import { useDataContext } from '../context/DataContext';
import { fetchFactionArmoryData, fetchFactionArmoryNews, fetchFactionData } from '../services/api';

const ArmoryGrid = ({ title, itemsArray }) => {
  if (!itemsArray || itemsArray.length === 0) return null;
  return (
    <div className="data-table-container glow-panel mt-4">
      <div className="table-header">
        <h2>{title}</h2>
      </div>
      <div className="table-responsive" style={{ padding: '24px' }}>
        <div className="armory-grid">
          {itemsArray.map((item, idx) => (
            <div key={idx} className="metric-card" style={{ padding: '16px', marginBottom: 0 }}>
              <h3 style={{ fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-main)' }}>{item.name}</h3>
              <div className="metric-value" style={{ fontSize: '1.25rem', color: 'var(--accent-primary)' }}>
                {item.quantity?.toLocaleString() || 1}
              </div>
              {item.loaned_to && <div className="text-muted mt-2" style={{fontSize: '0.75rem'}}>Loaned: {item.loaned_to}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const FactionArmory = () => {
  const { factionName } = useDataContext();
  const [data, setData] = useState(null);
  const [usageData, setUsageData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // View toggle: 'vault' | 'usage'
  const [viewMode, setViewMode] = useState('vault');
  const [loans, setLoans] = useState([]);

  useEffect(() => {
    let active = true;
    const loadInfo = async () => {
      setLoading(true);
      try {
        const res = await fetchFactionArmoryData();
        const newsRes = await fetchFactionArmoryNews().catch(() => ({}));
        const factionRes = await fetchFactionData().catch(() => ({ members: {} }));
        
        if (active) {
          setData(res);
          const formattedUsage = buildUsageTable(res, newsRes, factionRes.members);
          setUsageData(formattedUsage);
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadInfo();
    return () => { active = false; };
  }, [refreshKey]);

  const buildUsageTable = (armory, news, members) => {
    const map = {};
    
    // Normalize members to an iterable array and pre-populate the matrix
    const memArray = Array.isArray(members) ? members : Object.values(members || {});
    memArray.forEach(m => {
       const id = String(m.id || m.player_id);
       map[id] = {
         id,
         name: m.name || `Unknown [${id}]`,
         weapons: [],
         armor: [],
         xanax: 0,
         medical: 0,
         energy: 0
       };
    });
    
    const initUser = (id, nameStr = null) => {
      id = String(id);
      if (!map[id]) {
        map[id] = {
          id,
          name: nameStr || `Unknown [${id}]`,
          weapons: [],
          armor: [],
          xanax: 0,
          medical: 0,
          energy: 0
        };
      }
    };

    const processLoan = (loanedTo, itemName, type) => {
       if (!loanedTo) return;
       // Handle comma-separated loan strings inherently returned by Torn
       const ids = String(loanedTo).split(',').map(s => s.trim());
       ids.forEach(id => {
          if (!id) return;
          initUser(id);
          map[id][type].push(itemName);
       });
    };

    // 1. Process Loaned Equipment
    if (armory.weapons) {
       Object.values(armory.weapons).forEach(w => processLoan(w.loaned_to, w.name, 'weapons'));
    }
    if (armory.armor) {
       Object.values(armory.armor).forEach(a => processLoan(a.loaned_to, a.name, 'armor'));
    }

    // 2. Parse Historical Logs (Last 30 Days)
    const newsArray = Object.values(news || {});
    newsArray.forEach(log => {
       if (!log.news) return;
       let id, name, qty, item;
       
       // Torn V1 often returns HTML links for profiles
       const htmlMatch = log.news.match(/XID=(\d+)["'][^>]*>([^<]+)<\/a> used (\d+)x (.*?) from the armory/i);
       if (htmlMatch) {
          id = String(htmlMatch[1]);
          name = htmlMatch[2];
          qty = parseInt(htmlMatch[3]);
          item = htmlMatch[4].toLowerCase();
       } else {
          // Torn standard plain text fallback
          const plainMatch = log.news.match(/(.+?) \[(\d+)\] used (\d+)x (.*?) from the armory/i);
          if (plainMatch) {
             name = plainMatch[1];
             id = String(plainMatch[2]);
             qty = parseInt(plainMatch[3]);
             item = plainMatch[4].toLowerCase();
          }
       }

       if (id && item) {
          initUser(id, name);
          if (item.includes('xanax')) map[id].xanax += qty;
          else if (item.includes('first aid') || item.includes('morphine') || item.includes('blood')) map[id].medical += qty;
          else if (item.includes('can') || item.includes('energy') || item.includes('fcs')) map[id].energy += qty;
       }
    });

    // Sub-sort dynamically 
    return Object.values(map).sort((a,b) => b.xanax - a.xanax || b.medical - a.medical || a.name.localeCompare(b.name));
  };

  const formatToArray = (obj) => {
    if (!obj) return [];
    if (Array.isArray(obj)) return obj;
    return Object.entries(obj).map(([id, val]) => ({ id, ...val }));
  };

  const renderFinancials = () => {
    if (!data?.currency) return null;
    const { faction, points } = data.currency;
    return (
      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Faction Bank</h3>
          <div className="metric-value" style={{color: 'var(--accent-primary)'}}>${(faction || 0).toLocaleString()}</div>
        </div>
        <div className="metric-card">
          <h3>Faction Points</h3>
          <div className="metric-value">{(points || 0).toLocaleString()}</div>
        </div>
      </div>
    );
  };

  const renderUsageTable = () => {
    if (usageData.length === 0) return <div className="text-center p-4">No active loans or consumable usage recorded.</div>;
    return (
      <div className="table-responsive glow-panel mt-4">
        <div className="table-header">
           <h2>Total Faction Usage & Loan Log</h2>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Loaned Weapons</th>
              <th>Loaned Armor</th>
              <th style={{color: 'var(--accent-primary)'}}>Xanax (30d)</th>
              <th style={{color: 'var(--hp-life)'}}>Medical (30d)</th>
              <th style={{color: 'var(--hp-energy)'}}>Energy (30d)</th>
            </tr>
          </thead>
          <tbody>
             {usageData.map(u => (
               <tr key={u.id}>
                 <td style={{fontWeight: 'bold'}}>{u.name} <span className="text-muted">[{u.id}]</span></td>
                 <td className="text-muted" style={{fontSize: '0.8rem'}}>{u.weapons.join(', ') || '-'}</td>
                 <td className="text-muted" style={{fontSize: '0.8rem'}}>{u.armor.join(', ') || '-'}</td>
                 <td style={{color: 'var(--accent-primary)', fontWeight: 'bold'}}>{u.xanax || '-'}</td>
                 <td style={{color: 'var(--hp-life)', fontWeight: 'bold'}}>{u.medical || '-'}</td>
                 <td style={{color: 'var(--hp-energy)', fontWeight: 'bold'}}>{u.energy || '-'}</td>
               </tr>
             ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="page-container">
      <div className="page-header d-flex-between">
        <div>
          <h1>Armory :: <span className="accent-text">{factionName}</span></h1>
          <p>Financials, Medical Supplies, and Contraband.</p>
        </div>
        <div className="view-toggle-group">
          <button className={`action-button small ${viewMode === 'vault' ? 'active' : 'outline'}`} onClick={() => setViewMode('vault')}>Vault Inventory</button>
          <button className={`action-button small ${viewMode === 'usage' ? 'active' : 'outline'}`} onClick={() => setViewMode('usage')}>Member Usage</button>
          <button className="action-button small outline" onClick={() => setRefreshKey(k => k + 1)}>Refresh</button>
        </div>
      </div>

      {error ? (
        <div className="access-denied-panel glow-panel p-4">
          <h2 style={{color: 'var(--hp-nerve)', marginBottom: '16px'}}>Access Denied</h2>
          <p className="text-muted">Your API Key does not have the required faction permissions to view the Armory.</p>
          <div style={{fontSize: '0.85rem', marginTop: '8px'}}>{error}</div>
        </div>
      ) : loading ? (
        <div className="text-center py-4">Scanning Vaults...</div>
      ) : viewMode === 'vault' ? (
        <>
          {renderFinancials()}
          <ArmoryGrid title="Substance Abuse (Drugs)" itemsArray={formatToArray(data.drugs)} />
          <ArmoryGrid title="Healz (Medical)" itemsArray={formatToArray(data.medical)} />
          <ArmoryGrid title="Weapons Cache" itemsArray={formatToArray(data.weapons)} />
          <ArmoryGrid title="Armor Cache" itemsArray={formatToArray(data.armor)} />
        </>
      ) : (
        renderUsageTable()
      )}
    </div>
  );
};

export default FactionArmory;
