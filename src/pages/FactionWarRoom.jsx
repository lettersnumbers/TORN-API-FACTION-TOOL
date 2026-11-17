import React, { useState, useEffect } from 'react';
import { useDataContext } from '../context/DataContext';
import { fetchFactionWarData, fetchEnemyRoster, fetchUserData, fetchUserSpecific, fetchFactionActiveWars, getFactionId } from '../services/api';

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
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Auto-refresh state
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(60000);

  useEffect(() => {
    if (!autoRefresh) return;
    const intId = setInterval(() => {
       setRefreshTrigger(prev => prev + 1);
    }, refreshInterval);
    return () => clearInterval(intId);
  }, [autoRefresh, refreshInterval]);

  useEffect(() => {
    let active = true;
    const loadInfo = async () => {
      if (refreshTrigger === 0) setLoading(true);
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
        if (active && refreshTrigger === 0) setLoading(false);
      }
    };
    loadInfo();
    return () => { active = false; };
  }, [factionName, refreshTrigger, refreshKey]);

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
          // polling error silenced
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
          <div key={dest} className="radar-location">
             <h4>{dest.replace('In ', '').replace('Traveling to ', '')}</h4>
             <ul>
               {agents.map(a => (
                 <li key={a.id}>
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
        <div className="war-panel-header-gold">
          <h2>Recent War Attacks</h2>
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
        <div className="war-panel-header-gold">
          <h2>Recent War Attacks</h2>
        </div>
        <div className="attack-feed-container">
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
                <div key={att.id || att.code || (timeNum + '-' + attackerId)} className={`attack-feed-item ${isWin ? 'win' : isLoss ? 'loss' : ''}`}>
                  <div className="attack-feed-detail">
                    <div style={{ fontSize: '0.95rem' }}>
                       <span style={{ fontWeight: isWeAttacked ? 'bold' : 'normal', color: isWeAttacked ? '#fff' : 'inherit' }}>{attackerName}</span>
                       <span className="text-muted" style={{ margin: '0 8px' }}>vs</span>
                       <span style={{ fontWeight: !isWeAttacked ? 'bold' : 'normal', color: !isWeAttacked ? '#fff' : 'inherit' }}>{defenderName}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {timeNum ? new Date(timeNum * 1000).toLocaleTimeString() : 'Unknown'} - {att.result} {att.stealth ? '(Stealthed)' : ''}
                    </div>
                  </div>
                  <div className="attack-respect" style={{ color }}>
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
      <div>
        <div style={{ backgroundColor: 'var(--panel-bg)', minHeight: '500px' }}>
          <div className="war-panel-header-red">
            <h3>
              {enemyMembers.length > 0 ? enemyMembers[0].faction_name : 'Active Adversaries'}
            </h3>
          </div>
          <table className="data-table" style={{ border: 'none' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.3)' }}>
                <th style={{ width: '40px' }}>O</th>
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
                          <span
                            className={m.last_action?.status === 'Online' ? 'online-dot' : m.last_action?.status === 'Idle' ? 'idle-dot' : 'offline-dot'}
                            title={m.last_action?.status || 'Offline'}
                          ></span>
                      </div>
                    </td>
                    <td>
                      <div className="member-cell-stack">
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
                      <div className="wl-badge">
                        <div><span className="win-count">W: {m.wins}</span></div>
                        <div><span className="loss-count">L: {m.losses}</span></div>
                      </div>
                    </td>
                    <td>
                      <a 
                        href={`https://www.torn.com/page.php?sid=attack&user2ID=${m.id}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className={`attack-btn ${isOkay ? 'target-ok' : ''}`}
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
      </div>
    );
  };

  // Helper for advanced chaining metrics
  const renderChainMetrics = () => {
     if (!data || !data.chain) return null;
     const currentChain = data.chain.current || 0;
     if (currentChain === 0) return null;

     const milestones = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
     const nextBonus = milestones.find(m => m > currentChain) || 'Maxed';
     const hitsRemaining = typeof nextBonus === 'number' ? nextBonus - currentChain : 0;
     
     const timeout = data.chain.timeout || 0;
     const isCritical = timeout > 0 && timeout < 120; // Under 2 mins
     const isApproaching = hitsRemaining > 0 && hitsRemaining <= 10;
     
     return (
       <div className="glow-panel chain-banner" style={{ borderColor: 'var(--hp-nerve)' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: 'var(--hp-nerve)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Active Chain</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff' }}>{currentChain}</span>
         </div>
         
         <div className="chain-banner-info">
            <div style={{ display: 'flex', gap: '20px', alignItems: 'baseline' }}>
               <span style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                  Next Bonus: <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>{nextBonus}</span>
               </span>
               <span className={`${isCritical ? 'text-danger' : 'text-muted'}`} style={{ fontWeight: isCritical ? 'bold' : 'normal', fontSize: '0.9rem' }}>
                  {isCritical && <span style={{ marginRight: '4px' }}>⚠️ PUSH: </span>}
                  Timer: {timeout}s
               </span>
            </div>
            {isApproaching && (
               <div style={{ color: '#ffaa00', fontWeight: 'bold', fontSize: '0.75rem', marginTop: '2px' }}>
                 ⚠️ BONUS APPROACHING (Hold for Mux/Warlord)
               </div>
            )}
         </div>
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
      { color: '#fbbf24', icon: '🥇', cssClass: 'gold' },
      { color: '#cbd5e1', icon: '🥈', cssClass: 'silver' },
      { color: '#b45309', icon: '🥉', cssClass: 'bronze' }
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
               <div key={m.id || m.name} className={`mvp-row ${['gold', 'silver', 'bronze'][idx] || 'bronze'}`}>
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

  return (
    <div className="page-container">
      <div className="page-header war-header">
        <div>
          <h1>War Room :: <span className="accent-text">{factionName}</span></h1>
          {warDetails ? (() => {
             const ourFid = data?.id || parseInt(getFactionId());
             const fData = warDetails.factions || {};
             const fList = Array.isArray(fData) ? fData : Object.values(fData);
             const us = fList.find(f => parseInt(f.id) === ourFid || f.name === factionName);
             const them = fList.find(f => parseInt(f.id) !== ourFid && f.name !== factionName);
             const target = warDetails.target || 0;
             return (
               <div className="war-status-line">
                 <span>Duration: <strong style={{ color: 'var(--accent-primary)' }}>{countdown || 'CALCULATING...'}</strong></span>
                 {target > 0 && (
                   <span>
                     SCORE: <strong style={{ color: '#10b981' }}>{us?.score || 0}</strong> / <strong style={{ color: '#ef4444' }}>{them?.score || 0}</strong> <span style={{opacity: 0.7}}>(Target: {target})</span>
                   </span>
                 )}
               </div>
             );
          })() : (
            <p style={{ margin: 0 }}>Active conflicts, chain status, and recent combat operations.</p>
          )}
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          {renderChainMetrics()}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
          <button className="action-button small" onClick={() => setRefreshKey(k => k + 1)}>Refresh Feed</button>
          <div className="auto-refresh-controls">
            <input 
               type="checkbox" 
               id="autoRefresh" 
               checked={autoRefresh} 
               onChange={(e) => setAutoRefresh(e.target.checked)} 
               style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
            />
            <label htmlFor="autoRefresh" style={{ cursor: 'pointer', margin: 0 }}>Auto-Refresh</label>
            <select 
               className="auto-refresh-select"
               value={refreshInterval} 
               onChange={(e) => setRefreshInterval(Number(e.target.value))}
               disabled={!autoRefresh}
            >
               <option value={30000}>30s</option>
               <option value={60000}>1m</option>
               <option value={120000}>2m</option>
               <option value={300000}>5m</option>
            </select>
          </div>
        </div>
      </div>
      
      {error ? <div className="error-message">Error: {error}</div> : loading ? <div className="text-center py-4">Synchronizing Telemetry...</div> : (
        <>
          <div className="war-layout">
            {/* Main Content Pane */}
            <div className="war-main-pane">
              <div className="data-table-container glow-panel overflow-hidden">
                {renderSplitRoster()}
              </div>
            </div>
            
            {/* Right Sidebar */}
            <div className="war-sidebar">
              {renderMVPs()}
              {renderAttackFeed()}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FactionWarRoom;
