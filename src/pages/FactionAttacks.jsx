import React, { useState, useEffect } from 'react';
import { useDataContext } from '../context/DataContext';
import { fetchFactionWarData, getFactionId } from '../services/api';

const FactionAttacks = () => {
  const { factionName } = useDataContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    const loadInfo = async () => {
      setLoading(true);
      try {
        const res = await fetchFactionWarData();
        if (active) setData(res);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadInfo();
    return () => { active = false; };
  }, [factionName, refreshKey]);

  const renderAttacks = () => {
    if (!data || !data.attacks) return <div className="text-center py-4">No complete attack logs available.</div>;
    const attacksArray = Object.entries(data.attacks).map(([id, attack]) => ({ id, ...attack }));
    
    return (
      <div className="table-responsive glow-panel mt-4">
        <div className="table-header">
           <h2>Engagement Log (Total 100)</h2>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Attacker</th>
              <th>Defender</th>
              <th>Result</th>
              <th style={{ textAlign: 'right' }}>Respect</th>
            </tr>
          </thead>
          <tbody>
            {attacksArray.sort((a,b) => {
               const timeA = a.ended || a.started || a.timestamp_ended;
               const timeB = b.ended || b.started || b.timestamp_ended;
               return timeB - timeA;
            }).map(att => {
              const ourFactionId = data.id || parseInt(getFactionId()) || 0;
              const weAttacked = (att.attacker_faction === ourFactionId) || (att.attacker_faction_id === ourFactionId);
              
              const winResults = ['Hospitalized', 'Mugged', 'Special', 'Arrested', 'Looted'];
              const isWinResult = winResults.includes(att.result);
              
              const factionWon = weAttacked ? isWinResult : !isWinResult;
              const resultColor = factionWon ? 'var(--accent-primary)' : 'var(--hp-nerve)';
              
              let attackerName = att.attacker?.name || att.attacker_name || 'Someone';
              const attackerId = att.attacker?.id || att.attacker_id || 0;
              let defenderName = att.defender?.name || att.defender_name || 'Someone';
              const defenderId = att.defender?.id || att.defender_id || 0;
              
              // Stealth identity fallback via roster mapping
              if ((attackerName === 'Someone' || attackerName === '' || !attackerName) && attackerId > 0 && data.members?.[attackerId]) {
                 attackerName = data.members[attackerId].name;
              }
              if ((defenderName === 'Someone' || defenderName === '' || !defenderName) && defenderId > 0 && data.members?.[defenderId]) {
                 defenderName = data.members[defenderId].name;
              }

              const timeNum = att.ended || att.started || att.timestamp_ended || att.timestamp_started;
              const respectVal = parseFloat(att.respect || att.respect_gain || 0).toFixed(2);

              return (
                <tr key={att.id}>
                  <td>{timeNum ? new Date(timeNum * 1000).toLocaleString() : 'N/A'}</td>
                  <td>{attackerName} <span className="text-muted">[{attackerId || '?'}]</span></td>
                  <td>{defenderName} <span className="text-muted">[{defenderId || '?'}]</span></td>
                  <td style={{ color: resultColor, fontWeight: 'bold' }}>{att.result}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', color: resultColor }}>
                     {respectVal > 0 ? (factionWon ? `+${respectVal}` : `-${respectVal}`) : '0.00'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="page-container">
      <div className="page-header d-flex-between">
        <div>
          <h1>Attack Log :: <span className="accent-text">{factionName}</span></h1>
          <p>Recent worldwide faction combat history.</p>
        </div>
        <button className="action-button small" onClick={() => setRefreshKey(k => k + 1)}>Refresh Feed</button>
      </div>

      {error ? <div className="error-message">Error: {error}</div> : loading ? <div className="text-center py-4">Fetching combat logs...</div> : (
        renderAttacks()
      )}
    </div>
  );
};

export default FactionAttacks;
