import React, { useState, useEffect } from 'react';
import { useDataContext } from '../context/DataContext';
import { fetchFactionWarData, fetchEnemyRoster, fetchUserData, fetchUserSpecific, fetchAnyUserSpecific, fetchFactionActiveWars, getFactionId } from '../services/api';

const StatusCell = ({ status }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!status?.until) return;
    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = status.until - now;
      if (diff <= 0) setTimeLeft('');
      else {
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = diff % 60;
        if (h > 0) setTimeLeft(`(${h}h ${m}m)`);
        else setTimeLeft(`(${m}m ${s}s)`);
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [status]);

  const stateStr = status?.details || status?.state || 'Okay';
  const isBad = status?.state === 'Hospital';
  
  return (
    <div style={{ color: isBad ? 'var(--hp-nerve)' : 'inherit', display: 'flex', flexDirection: 'column' }}>
      <span>{stateStr}</span>
      {timeLeft && <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{timeLeft}</span>}
    </div>
  );
};

const FactionWarRoom = () => {
  const { factionName } = useDataContext();
  const [data, setData] = useState(null);
  const [enemyMembers, setEnemyMembers] = useState([]);
  const [userLevel, setUserLevel] = useState(0);
  const [userId, setUserId] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [warDetails, setWarDetails] = useState(null);
  const [countdown, setCountdown] = useState('');
  
  const [targetAnalysis, setTargetAnalysis] = useState({});
  const [analysisLoading, setAnalysisLoading] = useState({});

  useEffect(() => {
    document.documentElement.style.setProperty('--accent-primary', '#ef4444');
    document.documentElement.style.setProperty('--accent-secondary', '#94a3b8');
    document.documentElement.style.setProperty('--accent-glow', 'rgba(239, 68, 68, 0.4)');
    document.documentElement.style.setProperty('--bg-main', 'radial-gradient(circle at center, #1a0505 0%, #02040a 100%)');

    return () => {
      document.documentElement.style.setProperty('--accent-primary', '#00f0ff');
      document.documentElement.style.setProperty('--accent-secondary', '#ff003c');
      document.documentElement.style.setProperty('--accent-glow', 'rgba(0, 240, 255, 0.4)');
      document.documentElement.style.setProperty('--bg-main', 'radial-gradient(circle at top, #02101a 0%, #02040a 100%)');
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadInfo = async () => {
      setLoading(true);
      try {
        const res = await fetchFactionWarData();
        const warsRes = await fetchFactionActiveWars().catch(() => ({ wars: { ranked: null, raids: null, territory: null } }));
        const userRes = await fetchUserData().catch(() => ({ level: 0 }));
        
        // Accumulate active enemy factions
        let enemies = [];
        const enemyFactions = new Set();
        const ourFid = res.id || parseInt(getFactionId());
        
        // Parse the new /faction/wars schema safely
        if (warsRes.wars?.ranked) {
          const raw = warsRes.wars.ranked;
          const rankedArr = Array.isArray(raw) ? raw : (raw.war_id || raw.start || raw.factions) ? [raw] : Object.values(raw);
          rankedArr.forEach(rw => {
             if (!rw) return;
             if (rw.war_id || rw.start) setWarDetails(rw);
             
             if (rw.factions) {
               const rawF = rw.factions;
               const facArray = Array.isArray(rawF) ? rawF : (rawF.id || rawF.name) ? [rawF] : Object.values(rawF);
               facArray.forEach(f => {
                 if (f && parseInt(f.id) !== ourFid && f.name !== factionName) enemyFactions.add(parseInt(f.id));
               });
             }
          });
        }
        
        // Add territory or standard raids safely
        if (warsRes.wars?.territory) {
            const raw = warsRes.wars.territory;
            const terrArr = Array.isArray(raw) ? raw : (raw.war_id || raw.start || raw.factions) ? [raw] : Object.values(raw);
            terrArr.forEach(tw => {
                if (!tw || !tw.factions) return;
                const rawF = tw.factions;
                const fArr = Array.isArray(rawF) ? rawF : (rawF.id || rawF.name) ? [rawF] : Object.values(rawF);
                fArr.forEach(f => { if (f && parseInt(f.id) !== ourFid && f.name !== factionName) enemyFactions.add(parseInt(f.id)) });
            });
        }
        if (warsRes.wars?.raids) {
            const raw = warsRes.wars.raids;
            const raidsArr = Array.isArray(raw) ? raw : (raw.war_id || raw.start || raw.factions) ? [raw] : Object.values(raw);
            raidsArr.forEach(tw => {
                if (!tw || !tw.factions) return;
                const rawF = tw.factions;
                const fArr = Array.isArray(rawF) ? rawF : (rawF.id || rawF.name) ? [rawF] : Object.values(rawF);
                fArr.forEach(f => { if (f && parseInt(f.id) !== ourFid && f.name !== factionName) enemyFactions.add(parseInt(f.id)) });
            });
        }

        if (enemyFactions.size > 0) {
          const rosters = await Promise.all(Array.from(enemyFactions).map(id => fetchEnemyRoster(id).catch(() => null)));
          rosters.forEach(r => {
             // Basic cross-check: avoid adding our own faction to the "enemies" list
             if (r && r.members && r.faction && r.faction.id !== ourFid) {
                Object.values(r.members).forEach(m => {
                   enemies.push({ ...m, faction_name: r.faction.name, faction_id: r.faction.id });
                });
             }
          });
        }

        if (active) {
          setData(res);
          setUserLevel(userRes.level || 0);
          setUserId(userRes.player_id || 0);
          setEnemyMembers(enemies);
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadInfo();
    return () => { active = false; };
  }, [factionName]);

  useEffect(() => {
    if (!warDetails || !warDetails.start) return;
    
    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const diff = warDetails.start - now;
      if (diff <= 0) {
         setCountdown('WAR IS ACTIVE');
      } else {
         const h = Math.floor(diff / 3600);
         const m = Math.floor((diff % 3600) / 60);
         const s = diff % 60;
         setCountdown(`${h}h ${m}m ${s}s`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [warDetails]);

  const handleAnalyze = async (enemyId, enemyLevel) => {
    setAnalysisLoading(prev => ({...prev, [enemyId]: true}));
    try {
      const ourStats = await fetchUserSpecific('personalstats').catch(() => ({}));
      const enemyStats = await fetchAnyUserSpecific(enemyId, 'personalstats').catch(() => ({}));
      
      const ourP = ourStats.personalstats || {};
      const enemyP = enemyStats.personalstats || {};
      
      const ourXanax = ourP.xantaken || 0;
      const enemyXanax = enemyP.xantaken || 0;
      
      const ourRefills = (ourP.refills || 0) + (ourP.energyrefills || 0);
      const enemyRefills = (enemyP.refills || 0) + (enemyP.energyrefills || 0);
      
      let score = 0;
      let reasons = [];
      
      const levelDiff = userLevel - enemyLevel;
      score += (levelDiff * 0.5);
      reasons.push(levelDiff >= 0 ? `Lvl Diff (+${levelDiff})` : `Lvl Diff (${levelDiff})`);

      const xanaxDiff = ourXanax - enemyXanax;
      score += (xanaxDiff * 0.25);
      reasons.push(xanaxDiff >= 0 ? `Xanax Diff (+${xanaxDiff})` : `Xanax Diff (${xanaxDiff})`);

      const refillsDiff = ourRefills - enemyRefills;
      score += (refillsDiff * 0.15);
      reasons.push(refillsDiff >= 0 ? `Refills Diff (+${refillsDiff})` : `Refills Diff (${refillsDiff})`);
      
      // Past Attacks history
      let wins = 0; let losses = 0;
      if (data && data.attacks) {
         Object.values(data.attacks).forEach(att => {
           // If we attacked them
           if (att.attacker_id === userId && att.defender_id === enemyId) {
             if (att.result === 'Hospitalized' || att.result === 'Mugged' || att.result === 'Special') wins++;
             else losses++;
           }
           // If they attacked us
           if (att.defender_id === userId && att.attacker_id === enemyId) {
             if (att.result === 'Hospitalized' || att.result === 'Mugged' || att.result === 'Special') losses++;
             else wins++;
           }
         });
      }
      
      let notRecommended = false;
      if (losses > 0 && wins === 0) {
         notRecommended = true;
         reasons.push(`UNVIABLE TARGET (Losses: ${losses}, Wins: 0)`);
         score = -9999;
      } else {
         if (wins > losses) { score += 1; reasons.push(`Past Wins (${wins}-${losses})`); }
         else if (losses > wins) { score -= 1; reasons.push(`Past Losses (${wins}-${losses})`); }
         else if (wins > 0 || losses > 0) { reasons.push(`History (${wins}-${losses})`); }
      }
      
      reasons.push("Tactics: LEAVE (Maximize hospital turnover)");
      
      setTargetAnalysis(prev => ({
        ...prev, 
        [enemyId]: { score: score === -9999 ? 'AVOID' : score.toFixed(2), reasons, loaded: true, notRecommended }
      }));
    } catch(err) {
      setTargetAnalysis(prev => ({...prev, [enemyId]: { error: 'Failed API Cache' }}));
    } finally {
      setAnalysisLoading(prev => ({...prev, [enemyId]: false}));
    }
  };


  const renderSideRadar = () => {
    if (enemyMembers.length === 0) return <div className="text-muted text-sm mt-2">No Active Wars Detected.</div>;

    const travelers = enemyMembers.filter(m => m.status?.state === 'Traveling' || m.status?.state === 'Abroad');
    if (travelers.length === 0) return <div className="text-muted text-sm mt-3 text-center">Radar Clear.<br/>No targets traveling.</div>;

    const locations = {};
    travelers.forEach(t => {
       const dest = t.status?.details || t.status?.state || 'Unknown';
       if (!locations[dest]) locations[dest] = [];
       locations[dest].push(t);
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
        {Object.entries(locations).map(([dest, agents]) => (
          <div key={dest} style={{ background: 'rgba(50, 205, 50, 0.05)', padding: '12px', borderLeft: '2px solid var(--accent-primary)', borderRadius: '0 4px 4px 0' }}>
             <h4 style={{color: 'var(--accent-primary)', margin: '0 0 10px 0', fontSize: '0.95rem'}}>{dest.replace('In ', '').replace('Traveling to ', '')}</h4>
             <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
               {agents.map(a => (
                 <li key={a.id} style={{ marginBottom: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                   <span style={{ fontWeight: 500 }}>{a.name}</span>
                   <span className="text-muted">[{a.level}]</span>
                 </li>
               ))}
             </ul>
          </div>
        ))}
      </div>
    );
  };

  const renderSplitRoster = () => {
    const ourMembers = data.members ? Object.values(data.members) : [];
    
    return (
      <div className="roster-split-grid">
        {/* Left Column: Enemy Faction */}
        <div style={{ backgroundColor: 'var(--panel-bg)', minHeight: '500px' }}>
          <div style={{ padding: '16px', background: 'rgba(220, 38, 38, 0.1)', borderBottom: '2px solid var(--hp-nerve)' }}>
            <h2 style={{color: 'var(--hp-nerve)', textAlign: 'center'}}>Active Adversaries</h2>
          </div>
          <table className="data-table" style={{ border: 'none' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.3)' }}>
                <th>Operative</th>
                <th>Level</th>
                <th>Status</th>
                <th>Intel</th>
              </tr>
            </thead>
            <tbody>
              {enemyMembers.length === 0 && (
                <tr><td colSpan="4" className="text-center text-muted">No Enemies Detected.</td></tr>
              )}
              {enemyMembers.sort((a,b) => b.level - a.level).map(m => {
                const analysis = targetAnalysis[m.id];
                const loading = analysisLoading[m.id];
                
                let bgStyle = 'transparent';
                if (analysis && analysis.loaded) {
                   if (analysis.notRecommended) bgStyle = 'rgba(220, 38, 38, 0.1)';
                   else if (parseFloat(analysis.score) > 0) bgStyle = 'rgba(50, 205, 50, 0.1)';
                }
                
                return (
                  <tr key={m.id} style={{ backgroundColor: bgStyle }}>
                    <td style={{ fontWeight: 'bold' }}>{m.name} <span className="text-muted">[{m.id}]</span></td>
                    <td>{m.level}</td>
                    <td><StatusCell status={m.status} /></td>
                    <td>
                      {loading ? <span className="text-muted">Scanning...</span> : analysis ? (
                        <div style={{ fontSize: '0.8rem' }}>
                          <div style={{ color: analysis.notRecommended ? 'var(--hp-nerve)' : (parseFloat(analysis.score) > 0 ? 'var(--accent-primary)' : 'inherit'), fontWeight: 'bold' }}>
                             {analysis.notRecommended ? 'AVOID' : `Score: ${analysis.score}`}
                          </div>
                          {(analysis.reasons || []).map((r, i) => <div key={i} className={analysis.notRecommended ? 'text-danger' : 'text-muted'} style={{fontSize: '0.7rem', color: analysis.notRecommended ? 'var(--hp-nerve)' : ''}}>{r}</div>)}
                          {analysis.error && <span className="text-muted">{analysis.error}</span>}
                        </div>
                      ) : (
                        <button className="action-button small" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => handleAnalyze(m.id, m.level)}>Scan</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Right Column: Logged In Faction */}
        <div style={{ backgroundColor: 'var(--panel-bg)', minHeight: '500px' }}>
          <div style={{ padding: '16px', background: 'rgba(50, 205, 50, 0.1)', borderBottom: '2px solid var(--accent-primary)' }}>
            <h2 style={{color: 'var(--accent-primary)', textAlign: 'center'}}>{factionName}</h2>
          </div>
          <table className="data-table" style={{ border: 'none' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.3)' }}>
                <th>Operative</th>
                <th>Level</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {ourMembers.length === 0 && (
                <tr><td colSpan="3" className="text-center text-muted">Roster Sync Failed.</td></tr>
              )}
              {ourMembers.sort((a,b) => b.level - a.level).map(m => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 'bold' }}>{m.name} <span className="text-muted">[{m.id}]</span></td>
                  <td>{m.level}</td>
                  <td><StatusCell status={m.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Helper for advanced chaining metrics
  const renderChainMetrics = () => {
     if (!data || !data.chain) return null;
     const currentChain = data.chain.current || 0;
     const milestones = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
     const nextBonus = milestones.find(m => m > currentChain) || 'Maxed';
     const hitsRemaining = typeof nextBonus === 'number' ? nextBonus - currentChain : 0;
     
     const timeout = data.chain.timeout || 0;
     const isCritical = timeout > 0 && timeout < 120; // Under 2 mins (Slow Chaining window)
     const isApproaching = hitsRemaining > 0 && hitsRemaining <= 10;
     
     return (
       <div className="metric-card" style={{ borderColor: currentChain > 0 ? 'var(--hp-nerve)' : 'var(--border-color)' }}>
         <h3 style={{ color: currentChain > 0 ? 'var(--hp-nerve)' : 'inherit' }}>Active Chain</h3>
         <div className="metric-value">{currentChain}</div>
         
         {currentChain > 0 && (
           <>
             <div className="mt-2" style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
                Next Bonus: <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>{nextBonus}</span>
             </div>
             {isApproaching && (
                <div style={{ color: '#ffaa00', fontWeight: 'bold', fontSize: '0.8rem', marginTop: '4px' }}>
                  ⚠️ BONUS APPROACHING (Hold for Mux/Warlord)
                </div>
             )}
           </>
         )}
         
         {timeout > 0 && (
           <div className={`mt-2 ${isCritical ? 'text-danger' : 'text-muted'}`} style={{ fontWeight: isCritical ? 'bold' : 'normal' }}>
             {isCritical && <span style={{ marginRight: '4px' }}>⚠️ PUSH: </span>}
             Timer: {timeout}s
           </div>
         )}
       </div>
     );
  };

  return (
    <div className="page-container">
      <div className="page-header d-flex-between">
        <div>
          <h1>War Room :: <span className="accent-text">{factionName}</span></h1>
          <p>Active conflicts, chain status, and recent combat operations.</p>
        </div>
        <button className="action-button small" onClick={() => window.location.reload()}>Refresh Feed</button>
      </div>
      
      {error ? <div className="error-message">Error: {error}</div> : loading ? <div className="text-center py-4">Synchronizing Telemetry...</div> : (
        <>
          {warDetails && (
            <div className="glow-panel p-4 mb-4" style={{ background: 'linear-gradient(45deg, rgba(220, 38, 38, 0.05), rgba(0,0,0,0))', borderLeft: '4px solid var(--hp-nerve)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <h2 style={{ color: 'var(--hp-nerve)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="pulse-dot" style={{ backgroundColor: 'var(--hp-nerve)', boxShadow: '0 0 8px var(--hp-nerve)' }}></span>
                  RANKED WAR
                </h2>
                <div style={{ fontSize: '1.2rem', fontFamily: 'monospace', color: 'var(--text-main)' }}>
                  T-MINUS: <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>{countdown || 'CALCULATING...'}</span>
                </div>
              </div>
              <div className="mt-3" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                 <p style={{ color: 'var(--text-main)', fontWeight: 'bold', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                   <span style={{ color: '#ffaa00' }}>⚠️</span> RULES OF ENGAGEMENT:
                 </p>
                 Both sides will attack at the same time. No attacking onliners. There will be no flying except for rehabing and no turtling. We will med out if needed for them and vice versa. We will stop at 2k. If they reach 3k before we get our points they will stop so we can get them. Once we reach our 2k points they will attack till the war finishes.
              </div>
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Main Content Pane */}
            <div style={{ flex: '1 1 100%', maxWidth: '100%', minWidth: '300px' }}>
              <div className="data-table-container glow-panel overflow-hidden">
                {renderSplitRoster()}
              </div>
            </div>
            
            {/* Right Sidebar */}
            <div style={{ flex: '0 0 280px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {renderChainMetrics()}
              
              <div className="metric-card" style={{ margin: 0 }}>
                <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Respect Balance <span style={{ color: 'var(--text-muted)' }}></span>
                </h3>
                <div className="metric-value" style={{ color: 'var(--accent-primary)' }}>{(data.respect || 0).toLocaleString()}</div>
              </div>
              
              <div className="metric-card" style={{ margin: 0 }}>
                <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   Recent Operations 
                   <span title="Total faction attacks within the last 24h cycle" style={{ cursor: 'help', fontSize: '0.8rem', color: 'var(--text-muted)' }}>ℹ️</span>
                </h3>
                <div className="metric-value">{data.attacks ? Object.keys(data.attacks).length : 0}</div>
              </div>

              <div className="glow-panel" style={{ padding: '16px', borderTop: '3px solid var(--accent-primary)' }}>
                <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', margin: 0 }}>
                  <span className="pulse-dot"></span> Geographic Radar
                </h3>
                {renderSideRadar()}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FactionWarRoom;
