import React, { useState, useEffect } from 'react';
import { useDataContext } from '../context/DataContext';
import { fetchFactionWarData, fetchEnemyRoster, fetchUserData, fetchUserSpecific, fetchAnyUserSpecific, fetchFactionActiveWars, getFactionId } from '../services/api';

const StatusCell = ({ status, lastAction }) => {
  const stateStr = status?.details || status?.state || 'Okay';
  const isBad = status?.state === 'Hospital';
  const isOffline = lastAction?.status === 'Offline' && lastAction?.relative;
  return (
    <div style={{ color: isBad ? 'var(--hp-nerve)' : 'inherit', display: 'flex', flexDirection: 'column' }}>
      <span>{stateStr}</span>
      {isOffline && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{lastAction.relative}</span>}
    </div>
  );
};

const TimeCell = ({ status }) => {
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

  return timeLeft ? <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{timeLeft}</span> : null;
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
  const [userAttacks, setUserAttacks] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: 'score', direction: 'desc' });
  const [enemyFactionIds, setEnemyFactionIds] = useState([]);
  const [userVitals, setUserVitals] = useState(null);

  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
      @keyframes attackPulse {
        0% { box-shadow: 0 0 5px #10b981; }
        50% { box-shadow: 0 0 20px #10b981, 0 0 10px #10b981 inset; }
        100% { box-shadow: 0 0 5px #10b981; }
      }
    `;
    document.head.appendChild(styleEl);

    document.documentElement.style.setProperty('--accent-primary', '#ef4444');
    document.documentElement.style.setProperty('--accent-secondary', '#94a3b8');
    document.documentElement.style.setProperty('--accent-glow', 'rgba(239, 68, 68, 0.4)');
    document.documentElement.style.setProperty('--bg-main', 'radial-gradient(circle at center, #1a0505 0%, #02040a 100%)');

    return () => {
      document.head.removeChild(styleEl);
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
        
        let activeWarDetails = null;
        if (res.rankedwars) {
           const rws = Object.values(res.rankedwars);
           if (rws.length > 0) activeWarDetails = rws[0];
        }
        
        // Parse the new /faction/wars schema safely
        if (warsRes.wars?.ranked) {
          const raw = warsRes.wars.ranked;
          const rankedArr = Array.isArray(raw) ? raw : (raw.war_id || raw.start || raw.factions) ? [raw] : Object.values(raw);
          rankedArr.forEach(rw => {
             if (!rw) return;
             if (!activeWarDetails && (rw.war_id || rw.start)) activeWarDetails = rw;
             
             if (rw.factions) {
               const rawF = rw.factions;
               const facArray = Array.isArray(rawF) ? rawF : (rawF.id || rawF.name) ? [rawF] : Object.values(rawF);
               facArray.forEach(f => {
                 if (f && parseInt(f.id) !== ourFid && f.name !== factionName) enemyFactions.add(parseInt(f.id));
               });
             }
          });
        }
        
        if (activeWarDetails) setWarDetails(activeWarDetails);
        
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
          const eFactionsArr = Array.from(enemyFactions);
          setEnemyFactionIds(eFactionsArr);
          const rosters = await Promise.all(eFactionsArr.map(id => fetchEnemyRoster(id).catch(() => null)));
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
          setUserId(parseInt(userRes.player_id || userRes.id) || 0);
          setEnemyMembers(enemies);
        }
        
        if (activeWarDetails?.start) {
           try {
              const myAttacksRes = await fetchUserSpecific('attacks', `&from=${activeWarDetails.start}&limit=1000`);
              if (active && myAttacksRes.attacks) setUserAttacks(myAttacksRes.attacks);
           } catch(e) {}
        }

        if (active) {
           try {
              const vitalsRes = await fetchUserSpecific('bars');
              if (vitalsRes) {
                 const b = vitalsRes.bars || vitalsRes;
                 if (b && b.life) {
                    setUserVitals({ life: b.life, energy: b.energy, nerve: b.nerve, happy: b.happy });
                 }
              }
           } catch(e) {}
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
    if (enemyFactionIds.length === 0) return;
    
    const interval = setInterval(async () => {
       try {
          const ourFid = data?.id || parseInt(getFactionId());
          const rosters = await Promise.all(enemyFactionIds.map(id => fetchEnemyRoster(id).catch(() => null)));
          let enemies = [];
          rosters.forEach(r => {
             if (r && r.members && r.faction && r.faction.id !== ourFid) {
                Object.values(r.members).forEach(m => {
                   enemies.push({ ...m, faction_name: r.faction.name, faction_id: r.faction.id });
                });
             }
          });
          if (enemies.length > 0) setEnemyMembers(enemies);
          
          const vitalsRes = await fetchUserSpecific('bars').catch(() => null);
          if (vitalsRes) {
             const b = vitalsRes.bars || vitalsRes;
             if (b && b.life) {
                setUserVitals({ life: b.life, energy: b.energy, nerve: b.nerve, happy: b.happy });
             }
          }
       } catch (err) {
          console.error("Error polling enemy status", err);
       }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [enemyFactionIds, data]);

  useEffect(() => {
    if (!warDetails || !warDetails.start) return;
    
    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const diff = warDetails.start - now;
      if (diff > 0) {
         const d = Math.floor(diff / 86400);
         const h = Math.floor((diff % 86400) / 3600);
         const m = Math.floor((diff % 3600) / 60);
         const s = diff % 60;
         const pad = n => n.toString().padStart(2, '0');
         setCountdown(`STARTS IN: ${pad(d)}:${pad(h)}:${pad(m)}:${pad(s)}`);
      } else {
         const duration = now - warDetails.start;
         const d = Math.floor(duration / 86400);
         const h = Math.floor((duration % 86400) / 3600);
         const m = Math.floor((duration % 3600) / 60);
         const s = duration % 60;
         const pad = n => n.toString().padStart(2, '0');
         setCountdown(`DURATION: ${pad(d)}:${pad(h)}:${pad(m)}:${pad(s)}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [warDetails]);

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

  const renderAttackFeed = () => {
    if (!data || !data.attacks) return (
      <div style={{ backgroundColor: 'var(--panel-bg)', minHeight: '500px' }}>
        <div style={{ padding: '16px', background: 'rgba(245, 158, 11, 0.1)', borderBottom: '2px solid #f59e0b' }}>
          <h2 style={{color: '#f59e0b', textAlign: 'center'}}>Recent War Attacks</h2>
        </div>
        <div className="text-center text-muted mt-4">No attack data available.</div>
      </div>
    );
    
    const ourFid = data.id || parseInt(getFactionId());
    const enemyIds = new Set(enemyMembers.map(m => m.id));
    
    const attacksArray = Object.values(data.attacks).filter(att => {
      const attId = att.attacker?.id || att.attacker_id;
      const defId = att.defender?.id || att.defender_id;
      return enemyIds.has(attId) || enemyIds.has(defId);
    }).sort((a, b) => {
      const tA = a.ended || a.started || a.timestamp_ended || a.timestamp_started || 0;
      const tB = b.ended || b.started || b.timestamp_ended || b.timestamp_started || 0;
      return tB - tA;
    });
    
    return (
      <div style={{ backgroundColor: 'var(--panel-bg)', minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', background: 'rgba(245, 158, 11, 0.1)', borderBottom: '2px solid #f59e0b' }}>
          <h2 style={{color: '#f59e0b', textAlign: 'center'}}>Recent War Attacks</h2>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', maxHeight: '750px' }}>
          {attacksArray.length === 0 ? (
            <div className="text-center text-muted mt-4">No recent attacks recorded.</div>
          ) : (
            attacksArray.slice(0, 100).map(att => {
              const attackerId = att.attacker?.id || att.attacker_id || 0;
              let attackerName = att.attacker?.name || att.attacker_name || 'Someone';
              const defenderId = att.defender?.id || att.defender_id || 0;
              let defenderName = att.defender?.name || att.defender_name || 'Someone';
              
              const isWeAttacked = (att.attacker_faction === ourFid) || (att.attacker_faction_id === ourFid);
              
              if ((attackerName === 'Someone' || !attackerName) && attackerId > 0 && data.members?.[attackerId]) attackerName = data.members[attackerId].name;
              if ((defenderName === 'Someone' || !defenderName) && defenderId > 0 && data.members?.[defenderId]) defenderName = data.members[defenderId].name;

              const attackerWon = ['Hospitalized', 'Mugged', 'Looted', 'Special', 'Arrested'].includes(att.result);
              const defenderWon = ['Defended', 'Stalemate'].includes(att.result);
              
              let isWin = false;
              let isLoss = false;
              if (isWeAttacked) {
                if (attackerWon) isWin = true;
                if (defenderWon) isLoss = true;
              } else {
                if (attackerWon) isLoss = true;
                if (defenderWon) isWin = true;
              }
              
              const color = isWin ? '#10b981' : isLoss ? '#ef4444' : 'var(--text-muted)';
              const respectGain = parseFloat(att.respect || att.respect_gain || 0);
              const respectStr = (isWin || respectGain > 0) ? `+${respectGain.toFixed(2)}` : respectGain.toFixed(2);
              const timeNum = att.ended || att.started || att.timestamp_ended || att.timestamp_started;
              
              return (
                <div key={att.id || att.code || (timeNum + '-' + attackerId)} style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                  backgroundColor: isWin ? 'rgba(16, 185, 129, 0.05)' : isLoss ? 'rgba(239, 68, 68, 0.05)' : 'transparent'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '0.95rem' }}>
                       <span style={{ fontWeight: isWeAttacked ? 'bold' : 'normal', color: isWeAttacked ? '#fff' : 'inherit' }}>{attackerName}</span>
                       <span className="text-muted" style={{ margin: '0 8px' }}>vs</span>
                       <span style={{ fontWeight: !isWeAttacked ? 'bold' : 'normal', color: !isWeAttacked ? '#fff' : 'inherit' }}>{defenderName}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {timeNum ? new Date(timeNum * 1000).toLocaleTimeString() : 'Unknown'} - {att.result} {att.stealth ? '(Stealthed)' : ''}
                    </div>
                  </div>
                  <div style={{ color, fontWeight: 'bold', fontSize: '1.15rem', textAlign: 'right' }}>
                    {respectStr}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const requestSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const renderSplitRoster = () => {
    const ourMembers = data.members ? Object.values(data.members) : [];
    
    const enrichedMembers = enemyMembers.map(m => {
       const apiScore = warDetails?.factions?.[m.faction_id]?.members?.[m.id]?.score || 0;
       let wins = 0;
       let losses = 0;
       let calculatedScore = 0;
       const enemyId = parseInt(m.id);
       const warStart = warDetails?.start || 0;

       if (userAttacks && Object.keys(userAttacks).length > 0) {
          const myId = parseInt(userId);
          Object.values(userAttacks).forEach(att => {
             const attTime = att.timestamp_ended || att.timestamp_started || att.ended || att.started || 0;
             if (warStart > 0 && attTime < warStart) return;
             const attId = parseInt(att.attacker?.id || att.attacker_id || 0);
             const defId = parseInt(att.defender?.id || att.defender_id || 0);
             const attackerWon = ['Hospitalized', 'Mugged', 'Looted', 'Special', 'Arrested', 'Attacked'].includes(att.result);
             const defenderWon = ['Lost', 'Defended', 'Stalemate'].includes(att.result);
             
             if (attId === myId && defId === enemyId) {
                if (attackerWon) wins++; else if (defenderWon) losses++;
             } else if (attId === enemyId && defId === myId) {
                if (attackerWon) losses++; else if (defenderWon) wins++;
             }
          });
       }

       if (data && data.attacks) {
          Object.values(data.attacks).forEach(att => {
             const attTime = att.timestamp_ended || att.timestamp_started || att.ended || att.started || 0;
             if (warStart > 0 && attTime < warStart) return;
             const attId = parseInt(att.attacker?.id || att.attacker_id || 0);
             const defId = parseInt(att.defender?.id || att.defender_id || 0);
             const attackerWon = ['Hospitalized', 'Mugged', 'Looted', 'Special', 'Arrested', 'Attacked'].includes(att.result);
             const defenderWon = ['Lost', 'Defended', 'Stalemate'].includes(att.result);
             const respectGain = parseFloat(att.respect || att.respect_gain || 0);
             
             if (attId === enemyId && attackerWon) calculatedScore += respectGain;
             if (defId === enemyId && defenderWon) calculatedScore += respectGain;
          });
       }

       const warScore = calculatedScore > 0 ? calculatedScore : apiScore;
       return { ...m, wins, losses, calculatedScore, warScore };
    });

    const sortedMembers = enrichedMembers.sort((a, b) => {
       let aVal = 0, bVal = 0;
       if (sortConfig.key === 'level') { aVal = a.level; bVal = b.level; }
       else if (sortConfig.key === 'score') { aVal = a.warScore; bVal = b.warScore; }
       else if (sortConfig.key === 'countdown') {
          aVal = a.status?.until || Number.MAX_SAFE_INTEGER;
          bVal = b.status?.until || Number.MAX_SAFE_INTEGER;
          if (aVal === bVal) return b.level - a.level;
       } else {
          aVal = a.warScore; bVal = b.warScore;
       }
       
       if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
       if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
       return 0;
    });

    return (
      <div className="roster-split-grid">
        <div style={{ backgroundColor: 'var(--panel-bg)', minHeight: '500px' }}>
          <div style={{ padding: '16px', background: 'rgba(220, 38, 38, 0.1)', borderBottom: '2px solid var(--hp-nerve)' }}>
            <h2 style={{color: 'var(--hp-nerve)', textAlign: 'center'}}>Active Adversaries</h2>
          </div>
          <table className="data-table" style={{ border: 'none' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.3)' }}>
                <th style={{ width: '40px' }}>Online?</th>
                <th>Operative</th>
                <th onClick={() => requestSort('level')} style={{ cursor: 'pointer' }}>Level {sortConfig.key === 'level' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                <th onClick={() => requestSort('score')} style={{ cursor: 'pointer' }}>Score {sortConfig.key === 'score' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                <th>Status</th>
                <th onClick={() => requestSort('countdown')} style={{ cursor: 'pointer' }}>Til Release {sortConfig.key === 'countdown' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                <th>History</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedMembers.length === 0 && (
                <tr><td colSpan="8" className="text-center text-muted">No Enemies Detected.</td></tr>
              )}
              {sortedMembers.map(m => {
                const isOkay = ['Okay'].includes(m.status?.state);
                const rowColor = isOkay ? '#10b981' : 'inherit';
                
                return (
                  <tr key={m.id} style={{ color: rowColor }}>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <span style={{
                            width: '10px', height: '10px', borderRadius: '50%',
                            backgroundColor: m.last_action?.status === 'Online' ? '#10b981' : (m.last_action?.status === 'Idle' ? '#f59e0b' : 'transparent'),
                            border: m.last_action?.status === 'Online' || m.last_action?.status === 'Idle' ? 'none' : '2px solid #64748b',
                            boxShadow: m.last_action?.status === 'Online' ? '0 0 8px #10b981' : (m.last_action?.status === 'Idle' ? '0 0 8px #f59e0b' : 'none')
                          }} title={m.last_action?.status || 'Offline'}></span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontWeight: 'bold' }}>{m.name}</span>
                        <a 
                          href={`https://www.torn.com/profiles.php?XID=${m.id}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ textDecoration: 'none', fontSize: '0.85rem', color: isOkay ? '#10b981' : 'var(--text-muted)' }}
                        >
                          [{m.id}]
                        </a>
                      </div>
                    </td>
                    <td>{m.level}</td>
                    <td style={{ fontWeight: 'bold', color: m.warScore > 0 && !isOkay ? 'var(--accent-primary)' : 'inherit' }}>
                      {typeof m.warScore === 'number' && !Number.isInteger(m.warScore) ? m.warScore.toFixed(2) : m.warScore}
                    </td>
                    <td><StatusCell status={m.status} lastAction={m.last_action} /></td>
                    <td><TimeCell status={m.status} /></td>
                    <td>
                      <div style={{ fontSize: '0.85rem', lineHeight: '1.2' }}>
                        <div style={{ color: '#10b981', fontWeight: 'bold' }}>W: {m.wins}</div>
                        <div style={{ color: '#ef4444', fontWeight: 'bold' }}>L: {m.losses}</div>
                      </div>
                    </td>
                    <td>
                      <a 
                        href={`https://www.torn.com/page.php?sid=attack&user2ID=${m.id}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="action-button small" 
                        style={{ 
                           padding: '6px 12px', fontSize: '0.75rem', textDecoration: 'none', 
                           backgroundColor: isOkay ? '#10b981' : 'var(--hp-nerve)', 
                           color: '#fff', border: 'none', display: 'inline-block',
                           animation: isOkay ? 'attackPulse 1.5s infinite' : 'none'
                        }}
                      >
                        Attack
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Right Column: Attack Feed */}
        {renderAttackFeed()}
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

  const renderMVPs = () => {
    if (!warDetails || !warDetails.factions) return null;
    const ourFid = data?.id || parseInt(getFactionId());
    
    const factionsData = warDetails.factions;
    const ourFaction = Array.isArray(factionsData) 
        ? factionsData.find(f => parseInt(f.id) === ourFid || f.name === factionName) 
        : (factionsData[ourFid] || Object.values(factionsData).find(f => parseInt(f.id) === ourFid || f.name === factionName));
        
    if (!ourFaction || !ourFaction.members) return null;

    const topMembers = Object.values(ourFaction.members)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 3);

    if (topMembers.length === 0) return (
      <div className="glow-panel" style={{ padding: '16px', borderTop: '3px solid #fbbf24', margin: 0 }}>
        <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🏆</span> War MVPs
        </h3>
        <div className="text-muted">No combat data available yet.</div>
      </div>
    );

    const medals = [
      { color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)', icon: '🥇' },
      { color: '#cbd5e1', bg: 'rgba(203, 213, 225, 0.1)', icon: '🥈' },
      { color: '#b45309', bg: 'rgba(180, 83, 9, 0.15)', icon: '🥉' }
    ];

    return (
      <div className="glow-panel" style={{ padding: '16px', borderTop: '3px solid #fbbf24', margin: 0 }}>
        <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🏆</span> War MVPs
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {topMembers.map((m, idx) => {
             const medal = medals[idx] || medals[2];
             return (
               <div key={m.id || m.name} style={{
                 display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                 padding: '8px 12px', background: medal.bg, borderRadius: '4px',
                 borderLeft: `3px solid ${medal.color}`
               }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <span style={{ fontSize: '1.2rem' }}>{medal.icon}</span>
                   <span style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#fff' }}>{m.name}</span>
                 </div>
                 <div style={{ fontWeight: 'bold', color: medal.color, fontSize: '1.1rem' }}>
                   {m.score || 0}
                 </div>
               </div>
             );
          })}
        </div>
      </div>
    );
  };

  const renderVitals = () => {
    if (!userVitals) {
       return (
         <div className="glow-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '3px solid var(--accent-primary)', margin: 0 }}>
           <h3 style={{ margin: '0 0 8px 0', color: 'var(--accent-primary)', fontSize: '1.1rem' }}>Vital Signs</h3>
           <div className="text-muted">Loading vitals...</div>
         </div>
       );
    }

    const { life, energy, nerve, happy } = userVitals;
    
    const renderBar = (label, current, max, color) => {
       const pct = max > 0 ? Math.min(100, Math.max(0, (current / max) * 100)) : 0;
       return (
         <div style={{ marginBottom: '12px' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>
             <span style={{ color: '#fff' }}>{label}</span>
             <span className="text-muted">{current} / {max}</span>
           </div>
           <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
             <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, boxShadow: `0 0 8px ${color}`, transition: 'width 0.5s ease-out' }}></div>
           </div>
         </div>
       );
    };

    return (
      <div className="glow-panel" style={{ padding: '16px', borderTop: '3px solid var(--accent-primary)', margin: 0, height: '100%' }}>
        <h3 style={{ margin: '0 0 16px 0', color: 'var(--accent-primary)', fontSize: '1.1rem' }}>Vital Signs</h3>
        {renderBar('Life', life?.current || 0, life?.maximum || 0, '#3b82f6')}
        {renderBar('Energy', energy?.current || 0, energy?.maximum || 0, '#10b981')}
        {renderBar('Nerve', nerve?.current || 0, nerve?.maximum || 0, '#ef4444')}
        {renderBar('Happy', happy?.current || 0, happy?.maximum || 0, '#f59e0b')}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '20px' }}>
            {renderVitals()}
            <div className="glow-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', borderTop: '3px solid var(--border-color)', margin: 0 }}>
              [Module 2 Placeholder]
            </div>
            <div className="glow-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', borderTop: '3px solid var(--border-color)', margin: 0 }}>
              [Module 3 Placeholder]
            </div>
            <div className="glow-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', borderTop: '3px solid var(--border-color)', margin: 0 }}>
              [Module 4 Placeholder]
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Main Content Pane */}
            <div style={{ flex: 1, minWidth: '300px', overflowX: 'auto' }}>
              <div className="data-table-container glow-panel overflow-hidden">
                {renderSplitRoster()}
              </div>
            </div>
            
            {/* Right Sidebar */}
            <div style={{ flex: '0 0 330px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {warDetails && (
                <div className="glow-panel p-3" style={{ background: 'linear-gradient(45deg, rgba(220, 38, 38, 0.05), rgba(0,0,0,0))', borderLeft: '4px solid var(--hp-nerve)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <h2 style={{ color: 'var(--hp-nerve)', margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="pulse-dot" style={{ backgroundColor: 'var(--hp-nerve)', boxShadow: '0 0 8px var(--hp-nerve)' }}></span>
                      RANKED WAR
                    </h2>
                    <div style={{ fontSize: '1rem', fontFamily: 'monospace', color: 'var(--text-main)' }}>
                      <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>{countdown || 'CALCULATING...'}</span>
                    </div>
                  </div>
                  <div className="mt-2" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                     <p style={{ color: 'var(--text-main)', fontWeight: 'bold', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                       <span style={{ color: '#ffaa00' }}>⚠️</span> ROE:
                     </p>
                     Both sides will attack at the same time. No attacking onliners. There will be no flying except for rehabing and no turtling. We will med out if needed for them and vice versa. We will stop at 2k. If they reach 3k before we get our points they will stop so we can get them. Once we reach our 2k points they will attack till the war finishes.
                  </div>
                </div>
              )}
              {renderChainMetrics()}
              
              <div className="metric-card" style={{ margin: 0 }}>
                <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Respect Balance <span style={{ color: 'var(--text-muted)' }}></span>
                </h3>
                <div className="metric-value" style={{ color: 'var(--accent-primary)' }}>{(data.respect || 0).toLocaleString()}</div>
              </div>
              
              {renderMVPs()}

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
