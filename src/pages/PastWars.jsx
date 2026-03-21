import React, { useState, useEffect } from 'react';
import { useDataContext } from '../context/DataContext';
import { fetchFactionPastWars, getFactionId } from '../services/api';

const PastWars = () => {
  const { factionName } = useDataContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wars, setWars] = useState([]);
  
  useEffect(() => {
    document.documentElement.style.setProperty('--accent-primary', '#ef4444');
    document.documentElement.style.setProperty('--accent-secondary', '#94a3b8');
    document.documentElement.style.setProperty('--accent-glow', 'rgba(239, 68, 68, 0.4)');
    document.documentElement.style.setProperty('--bg-main', 'radial-gradient(circle at top right, #1a0505 0%, #02040a 100%)');

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
        const res = await fetchFactionPastWars();
        if (active) {
          const raw = res.rankedwars || [];
          const warsArray = Array.isArray(raw) ? raw : Object.values(raw);
          setWars(warsArray);
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

  const ourFactionId = parseInt(getFactionId()) || 0;

  return (
    <div className="page-container">
      <div className="page-header d-flex-between">
        <div>
          <h1>Historical Archive :: <span className="accent-text">Ranked Wars</span></h1>
          <p>Analyzing the past 20 recorded Ranked War operations.</p>
        </div>
        <button className="action-button small" onClick={() => window.location.reload()}>Refresh History</button>
      </div>

      {error ? (
        <div className="error-message">Error: {error}</div>
      ) : loading ? (
        <div className="text-center py-4">De-archiving historical ledgers...</div>
      ) : (
        <div className="table-responsive glow-panel mt-4">
          <div className="table-header">
             <h2>Chronological Combat Ledger</h2>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Operation Date</th>
                <th>Adversary Faction</th>
                <th>Result</th>
                <th style={{ textAlign: 'right' }}>Final Score</th>
              </tr>
            </thead>
            <tbody>
              {wars.length === 0 && (
                <tr><td colSpan="4" className="text-center text-muted">No historical Ranked Wars found on record.</td></tr>
              )}
              {wars.map(war => {
                const facArray = Array.isArray(war.factions) ? war.factions : Object.values(war.factions || {});
                if (facArray.length < 1) return null;

                let us = facArray.find(f => parseInt(f.id) === ourFactionId || (f.name && factionName && f.name.toLowerCase() === factionName.toLowerCase()));
                let them = facArray.find(f => us && f.id !== us.id);
                
                // Fallback loop: Just grab indexes if mapping fails entirely.
                if (!us) {
                   us = facArray[0];
                   them = facArray[1] || { name: 'Unknown Target', score: 0 };
                } else if (!them) {
                   them = facArray.find(f => f.id !== us.id) || { name: 'Unknown Target', score: 0 };
                }

                const isWin = war.winner === us.id;
                const resultText = isWin ? 'VICTORY' : war.winner ? 'DEFEAT' : 'ONGOING';
                const resultColor = isWin ? 'var(--accent-primary)' : war.winner ? 'var(--hp-nerve)' : '#ffaa00';
                
                const timeStart = new Date(war.start * 1000).toLocaleDateString();
                const timeEnd = war.end ? new Date(war.end * 1000).toLocaleDateString() : 'Ongoing';

                return (
                  <tr key={war.war_id || war.id || war.start}>
                    <td style={{ fontWeight: '500' }}>
                      <span className="text-muted">{timeStart} — {timeEnd}</span>
                    </td>
                    <td style={{ fontWeight: 'bold' }}>{them.name} <span className="text-muted">[{them.id}]</span></td>
                    <td style={{ fontWeight: 'bold', color: resultColor, letterSpacing: '1px' }}>{resultText}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                       <span style={{ color: isWin ? 'var(--accent-primary)' : 'var(--text-main)' }}>{us.score}</span>
                       <span className="text-muted" style={{ margin: '0 8px' }}>vs</span>
                       <span style={{ color: !isWin ? 'var(--hp-nerve)' : 'var(--text-muted)' }}>{them.score}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PastWars;
