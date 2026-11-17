import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchFactionData, getApiKey, setApiKey, getFactionId, setFactionId } from '../services/api';
import { useDataContext } from '../context/DataContext';
import ExpandedMemberRow from '../components/ExpandedMemberRow';
import Avatar from '../components/Avatar';
import './FactionPage.css';

const FactionPage = () => {
  const { setFactionName, setHospitalCount } = useDataContext();
  
  const [apiKey, setLocalApiKey] = useState(getApiKey());
  const [factionId, setLocalFactionId] = useState(getFactionId());
  
  const [faction, setFaction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [sortConfig, setSortConfig] = useState({ key: 'days_in_faction', direction: 'descending' });
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [expandedUser, setExpandedUser] = useState(null);
  const [userStatsLoading, setUserStatsLoading] = useState({});
  const [userStatsData, setUserStatsData] = useState({});

  const toggleRow = (id) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  useEffect(() => {
    if (apiKey) {
      loadData();
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFactionData(factionId);
      setFaction(data.faction || data); // handle whether unnested or nested
      
      if (data.name) {
        setFactionName(data.name);
      } else if (data.faction?.name) {
        setFactionName(data.faction.name);
      }
      
      // Calculate how many members are in the hospital
      if (data.members || data.faction?.members) {
        const mems = data.members || data.faction.members;
        const memsArray = Array.isArray(mems) ? mems : Object.values(mems);
        const hospCount = memsArray.filter(m => m.status?.state === 'Hospital').length;
        setHospitalCount(hospCount);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = (e) => {
    e.preventDefault();
    setApiKey(apiKey);
    setFactionId(factionId);
    loadData();
  };

  const sortMembers = (members) => {
    if (!members) return [];
    
    // Torn v2 seems to return members as an array or object. 
    // Usually it's an array of members, or an object of { id: { name: ... } }
    let membersArray = Array.isArray(members) ? [...members] : Object.entries(members).map(([id, info]) => ({ id, ...info }));

    membersArray.sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];
      
      if (sortConfig.key === 'last_action') {
        valA = a.last_action?.timestamp || 0;
        valB = b.last_action?.timestamp || 0;
      } else if (sortConfig.key === 'name') {
        valA = (valA || '').toLowerCase();
        valB = (valB || '').toLowerCase();
      }

      if (valA < valB) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (valA > valB) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    return membersArray;
  };

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  if (!getApiKey() || error === "API Key is missing. Please configure it.") {
    return (
      <div className="page-container config-container">
        <div className="config-card glow-panel">
          <h2><span className="accent-text">System</span> Authorization</h2>
          <p>Please provide your Torn API key to establish connection.</p>
          <form onSubmit={handleSaveConfig} className="config-form">
            <div className="form-group">
              <label>API Key (Must have Minimal Access or higher)</label>
              <input 
                type="password" 
                value={apiKey} 
                onChange={e => setLocalApiKey(e.target.value)} 
                placeholder="Enter 16-character key"
                required
              />
            </div>
            <div className="form-group">
              <label>Target Faction ID (Optional - defaults to your faction)</label>
              <input 
                type="text" 
                value={factionId} 
                onChange={e => setLocalFactionId(e.target.value)} 
                placeholder="e.g. 123456"
              />
            </div>
            <button type="submit" className="action-button">Initialize Connection</button>
          </form>
          {error && <div className="error-message">Error: {error}</div>}
        </div>
      </div>
    );
  }

  const leader = faction?.members && faction?.leader_id ? Object.values(faction.members).find(m => m.id === faction.leader_id) : null;
  const coLeader = faction?.members && faction?.co_leader_id ? Object.values(faction.members).find(m => m.id === faction.co_leader_id) : null;

  return (
    <div className="page-container">
      <div className="page-header d-flex-between" style={{ alignItems: 'flex-start' }}>
        <div className="faction-header-flex">
          {faction?.tag_image && (
            <img 
              src={`https://factiontags.torn.com/${faction.tag_image}`} 
              alt="Faction Tag" 
              className="faction-tag-img"
            />
          )}
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="accent-text">{faction?.name || 'Loading...'}</span> 
              {faction?.tag && <span className="faction-tag-badge">[{faction.tag}]</span>}
            </h1>
            <p className="mt-2 text-muted" style={{ fontSize: '0.9rem' }}>
              Leader: {leader?.name || faction?.leader_id || 'N/A'} | Co-Leader: {coLeader?.name || faction?.co_leader_id || 'N/A'}
            </p>
          </div>
        </div>
        <button onClick={loadData} className="action-button small" disabled={loading}>
          {loading ? 'Syncing...' : 'Force Sync'}
        </button>
      </div>

      {error && <div className="error-message mb-4">Error: {error}</div>}

      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Enlistment</h3>
          <div className="metric-value" style={{fontSize: '1.25rem'}}>
            {faction?.members ? Object.keys(faction.members).length : 0} <span style={{fontSize: '0.8rem'}} className="text-muted">/ {faction?.capacity || '?'}</span>
          </div>
          <div className="text-muted mt-1" style={{fontSize: '0.85rem'}}>
            {faction?.days_old ? `${faction.days_old.toLocaleString()} Days Old` : 'Age Unknown'}
          </div>
        </div>
        <div className="metric-card">
          <h3>Total Respect</h3>
          <div className="metric-value" style={{fontSize: '1.25rem'}}>{(faction?.respect || 0).toLocaleString()}</div>
          <div className="text-muted mt-1" style={{fontSize: '0.85rem'}}>
            Rank: {faction?.rank?.name || 'Unknown'} {faction?.rank?.division ? `Div ${faction.rank.division}` : ''}
          </div>
        </div>
        <div className="metric-card">
          <h3>Combat Record</h3>
          <div className="metric-value" style={{fontSize: '1.25rem'}}>
            {faction?.best_chain?.toLocaleString() || 0} <span style={{fontSize: '0.8rem'}} className="text-muted">Best Chain</span>
          </div>
          {faction?.rank?.wins !== undefined && (
            <div className="text-muted mt-1" style={{fontSize: '0.85rem'}}>War Wins: {faction.rank.wins.toLocaleString()}</div>
          )}
        </div>
      </div>

      <div className="data-table-container glow-panel">
        <div className="table-header">
          <h2>{faction?.name || 'Active Roster'}</h2>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('name')} className="sortable">Name <span>{sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</span></th>
                <th onClick={() => handleSort('level')} className="sortable">Level <span>{sortConfig.key === 'level' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</span></th>
                <th onClick={() => handleSort('days_in_faction')} className="sortable">Days in Faction <span>{sortConfig.key === 'days_in_faction' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</span></th>
                <th onClick={() => handleSort('last_action')} className="sortable">Last Action <span>{sortConfig.key === 'last_action' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</span></th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && !faction ? (
                <tr>
                  <td colSpan="5" className="text-center py-4">Establishing connection...</td>
                </tr>
              ) : faction?.members ? (
                sortMembers(faction.members).map(member => {
                  const isExpanded = expandedRows.has(member.id);
                  const stateLC = member.status?.state?.toLowerCase();
                  
                  return (
                    <React.Fragment key={member.id}>
                      <tr 
                        className={`${member.status?.state === 'Hospital' ? 'row-hospital' : member.status?.state === 'Jail' ? 'row-jail' : ''} ${isExpanded ? 'active-expanded-row' : ''}`}
                        onClick={() => toggleRow(member.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <div className="member-cell-stack">
                            <div className="member-name">
                              <span className={`status-dot ${member.status?.state === 'Online' ? 'online' : member.status?.state === 'Idle' ? 'idle' : 'offline'}`}></span>
                              <Avatar playerId={member.id} name={member.name} size={28} />
                              <span className={isExpanded ? 'member-name-expanded' : ''}>{member.name}</span> 
                            </div>
                            <a 
                              href={`https://www.torn.com/profiles.php?XID=${member.id}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="member-id" 
                              style={{ textDecoration: 'none', paddingLeft: '20px' }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              [{member.id}]
                            </a>
                          </div>
                        </td>
                        <td>{member.level}</td>
                        <td>{member.days_in_faction}</td>
                        <td>{member.last_action?.relative || (member.last_action?.timestamp ? new Date(member.last_action.timestamp * 1000).toLocaleString() : 'Unknown')}</td>
                        <td>
                          <span className={`status-badge ${stateLC || 'okay'}`}>
                            {member.status?.description || member.status?.state || 'Okay'}
                          </span>
                        </td>
                      </tr>
                      {isExpanded && (
                         <ExpandedMemberRow member={member} colSpan={5} />
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-4">No roster data available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Battle Stats → moved to its own page */}
      <div className="battle-stats-cta">
        <div>
          <div className="battle-stats-cta-label">MEMBER BATTLE STATS</div>
          <div className="text-muted text-sm">View gym stats, growth charts, and faction comparison</div>
        </div>
        <Link to="/faction/battle-stats" className="battle-stats-cta-link">VIEW STATS →</Link>
      </div>
    </div>
  );
};

export default FactionPage;
