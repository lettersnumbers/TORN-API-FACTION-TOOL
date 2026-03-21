import React, { useState, useEffect } from 'react';
import { useDataContext } from '../context/DataContext';
import { fetchUserSpecific, fetchUserCrimes } from '../services/api';

const useSubPageFetch = (selection, additionalParams = '') => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await fetchUserSpecific(selection, additionalParams);
        setData(res);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [selection, additionalParams]);

  return { data, loading, error };
};

const StatGrid = ({ title, dataObj }) => {
  if (!dataObj || typeof dataObj !== 'object') return null;
  return (
    <div className="data-table-container glow-panel mt-4">
      <div className="table-header">
        <h2>{title}</h2>
      </div>
      <div className="table-responsive" style={{ padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
          {Object.entries(dataObj).filter(([k, v]) => typeof v !== 'object' && v !== null && k !== 'error').map(([key, value]) => (
            <div key={key} className="metric-card" style={{ padding: '16px', marginBottom: 0 }}>
              <h3 style={{ fontSize: '0.75rem', marginBottom: '8px', wordBreak: 'break-word', textTransform: 'capitalize' }}>
                {key.replace(/_/g, ' ')}
              </h3>
              <div className="metric-value" style={{ fontSize: '1.25rem' }}>
                {typeof value === 'number' ? value.toLocaleString() : String(value)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const UserCrimes = () => {
  const { userName } = useDataContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent-primary', '#f97316');
    document.documentElement.style.setProperty('--accent-secondary', '#ef4444');
    document.documentElement.style.setProperty('--accent-glow', 'rgba(249, 115, 22, 0.4)');
    document.documentElement.style.setProperty('--bg-main', 'radial-gradient(circle at center, #1a0a02 0%, #02040a 100%)');

    return () => {
      document.documentElement.style.setProperty('--accent-primary', '#00f0ff');
      document.documentElement.style.setProperty('--accent-secondary', '#ff003c');
      document.documentElement.style.setProperty('--accent-glow', 'rgba(0, 240, 255, 0.4)');
      document.documentElement.style.setProperty('--bg-main', 'radial-gradient(circle at top, #02101a 0%, #02040a 100%)');
    };
  }, []);

  useEffect(() => {
    const loadCrimes = async () => {
      setLoading(true);
      try {
        const res = await fetchUserCrimes();
        setData(res);
      } catch(err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadCrimes();
  }, []);
  
  const renderCrimesContent = () => {
    if (!data) return null;

    let totalNerve = 0;
    let completedCrimes = 0;
    let totalMoney = 0;
    let totalItems = 0;
    
    let tAttempts = 0;
    let tSuccess = 0;
    let tFail = 0;
    let tCrit = 0;
    let tProg = 0;

    Object.values(data).forEach(crime => {
      if (typeof crime === 'object' && crime !== null) {
        totalNerve += crime.nerve_spent || 0;
        if (crime.skill === 100) completedCrimes++;
        totalMoney += crime.rewards?.money || 0;
        totalItems += crime.rewards?.items?.length || 0;
        
        tAttempts += crime.attempts?.total || 0;
        tSuccess += crime.attempts?.success || 0;
        tFail += crime.attempts?.fail || 0;
        tCrit += crime.attempts?.critical_fail || 0;
        tProg += crime.progression_bonus || 0;
      }
    });

    return (
      <>
        <div className="metrics-grid mb-4">
          <div className="metric-card">
            <h3>Overall Efficiency</h3>
            <div className="metric-value">{completedCrimes} <span className="text-muted" style={{fontSize: '0.8rem'}}>Crimes Mastered (100 Skill)</span></div>
          </div>
          <div className="metric-card">
            <h3>Total Investment</h3>
            <div className="metric-value">{totalNerve.toLocaleString()} <span className="text-muted" style={{fontSize: '0.8rem'}}>Nerve Spent</span></div>
          </div>
          <div className="metric-card">
            <h3>Gross Returns</h3>
            <div className="metric-value" style={{color: 'var(--accent-primary)'}}>${totalMoney.toLocaleString()}</div>
            <div className="text-muted mt-1" style={{fontSize: '0.85rem'}}>Items Looted: {totalItems.toLocaleString()}</div>
          </div>
        </div>

        <div className="table-responsive glow-panel">
          <div className="table-header">
            <h2>Detailed Crime Log</h2>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Crime</th>
                <th>Total Attempts</th>
                <th>Success</th>
                <th>Failed</th>
                <th>Crit Fail</th>
                <th>Success Ratio</th>
                <th>Nerve Spent</th>
                <th>Skill</th>
                <th>Prog. Bonus</th>
                <th>Rewards</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data).map(([name, crime]) => {
                if (typeof crime !== 'object' || crime === null) {
                  return (
                    <tr key={name}>
                      <td style={{ fontWeight: 'bold' }}>{name}</td>
                      <td colSpan="9" className="text-muted">Completions: {crime}</td>
                    </tr>
                  );
                }

                const attempts = crime.attempts || {};
                const aTot = attempts.total || 0;
                const aSucc = attempts.success || 0;
                const aFail = attempts.fail || 0;
                const aCrit = attempts.critical_fail || 0;
                
                const failAndCrit = aFail + aCrit;
                const ratio = failAndCrit === 0 ? (aSucc > 0 ? "Perfect" : "0:0") : `${(aSucc / failAndCrit).toFixed(2)}:1`;

                const rewards = crime.rewards || {};
                const rewardItems = rewards.items?.length > 0 ? `${rewards.items.length} item(s)` : '';
                const rewardMoney = rewards.money ? `$${rewards.money.toLocaleString()}` : '';

                return (
                  <tr key={name}>
                    <td style={{ fontWeight: 'bold' }}>{name}</td>
                    <td>{aTot.toLocaleString()}</td>
                    <td>{aSucc.toLocaleString()}</td>
                    <td>{aFail.toLocaleString()}</td>
                    <td style={{color: aCrit > 0 ? 'var(--hp-nerve)' : 'inherit'}}>{aCrit.toLocaleString()}</td>
                    <td>{ratio}</td>
                    <td>{crime.nerve_spent?.toLocaleString() || 0}</td>
                    <td style={{color: crime.skill === 100 ? 'var(--accent-primary)' : 'inherit'}}>{crime.skill?.toLocaleString() || 0}</td>
                    <td>{crime.progression_bonus?.toLocaleString() || 0}</td>
                    <td>
                      {rewardMoney && <div style={{color: 'var(--accent-primary)'}}>{rewardMoney}</div>}
                      {rewardItems && <div className="text-muted" style={{fontSize: '0.85em'}}>{rewardItems}</div>}
                      {!rewardMoney && !rewardItems && <span className="text-muted">None</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 'bold', backgroundColor: 'var(--panel-bg)', borderTop: '2px solid var(--border-color)' }}>
                <td>TOTALS</td>
                <td>{tAttempts.toLocaleString()}</td>
                <td>{tSuccess.toLocaleString()}</td>
                <td>{tFail.toLocaleString()}</td>
                <td style={{color: tCrit > 0 ? 'var(--hp-nerve)' : 'inherit'}}>{tCrit.toLocaleString()}</td>
                <td>{tFail + tCrit === 0 ? "Perfect" : `${(tSuccess / (tFail + tCrit)).toFixed(2)}:1`}</td>
                <td>{totalNerve.toLocaleString()}</td>
                <td>-</td>
                <td>{tProg.toLocaleString()}</td>
                <td>
                  <div style={{color: 'var(--accent-primary)'}}>${totalMoney.toLocaleString()}</div>
                  <div className="text-muted" style={{fontSize: '0.85em'}}>{totalItems} item(s)</div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </>
    );
  };

  return (
    <div className="page-container">
      <div className="page-header d-flex-between">
        <div>
          <h1>Crimes & Skill :: <span className="accent-text">{userName}</span></h1>
        </div>
      </div>
      {error ? <div className="error-message">Error: {error}</div> : loading ? <div className="text-center py-4">Syncing Crimes Data...</div> : (
        renderCrimesContent()
      )}
    </div>
  );
};

export const UserStats = () => {
  const { userName } = useDataContext();
  const { data, loading, error } = useSubPageFetch('personalstats');

  useEffect(() => {
    document.documentElement.style.setProperty('--accent-primary', '#3b82f6');
    document.documentElement.style.setProperty('--accent-secondary', '#60a5fa');
    document.documentElement.style.setProperty('--accent-glow', 'rgba(59, 130, 246, 0.4)');
    document.documentElement.style.setProperty('--bg-main', 'radial-gradient(circle at bottom right, #050a1a 0%, #02040a 100%)');

    return () => {
      document.documentElement.style.setProperty('--accent-primary', '#00f0ff');
      document.documentElement.style.setProperty('--accent-secondary', '#ff003c');
      document.documentElement.style.setProperty('--accent-glow', 'rgba(0, 240, 255, 0.4)');
      document.documentElement.style.setProperty('--bg-main', 'radial-gradient(circle at top, #02101a 0%, #02040a 100%)');
    };
  }, []);

  return (
    <div className="page-container">
      <div className="page-header d-flex-between">
        <div>
          <h1>Personal Stats :: <span className="accent-text">{userName}</span></h1>
        </div>
      </div>
      {error ? <div className="error-message">Error: {error}</div> : loading ? <div className="text-center py-4">Syncing Stats Data...</div> : (
        <StatGrid title="Lifetime Performance" dataObj={data?.personalstats || data} />
      )}
    </div>
  );
};

export const UserTravel = () => {
  const { userName } = useDataContext();
  const { data, loading, error } = useSubPageFetch('travel');

  useEffect(() => {
    document.documentElement.style.setProperty('--accent-primary', '#a855f7');
    document.documentElement.style.setProperty('--accent-secondary', '#d946ef');
    document.documentElement.style.setProperty('--accent-glow', 'rgba(168, 85, 247, 0.4)');
    document.documentElement.style.setProperty('--bg-main', 'radial-gradient(circle at top left, #10051a 0%, #02040a 100%)');

    return () => {
      document.documentElement.style.setProperty('--accent-primary', '#00f0ff');
      document.documentElement.style.setProperty('--accent-secondary', '#ff003c');
      document.documentElement.style.setProperty('--accent-glow', 'rgba(0, 240, 255, 0.4)');
      document.documentElement.style.setProperty('--bg-main', 'radial-gradient(circle at top, #02101a 0%, #02040a 100%)');
    };
  }, []);

  return (
    <div className="page-container">
      <div className="page-header d-flex-between">
        <div>
          <h1>Flight & Travel :: <span className="accent-text">{userName}</span></h1>
        </div>
      </div>
      {error ? <div className="error-message">Error: {error}</div> : loading ? <div className="text-center py-4">Syncing Travel Data...</div> : (
        <StatGrid title="Current Itinerary" dataObj={data?.travel || data} />
      )}
    </div>
  );
};
