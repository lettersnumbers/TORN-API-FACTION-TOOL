import React, { useState, useEffect } from 'react';
import { fetchUserData, getApiKey } from '../services/api';
import { useDataContext } from '../context/DataContext';
import './FactionPage.css'; // Reusing some base styles

const ProgressBar = ({ label, current, max, colorVar }) => {
  const percentage = max > 0 ? Math.min(100, (current / max) * 100) : 0;
  return (
    <div className="progress-container mb-3" style={{ marginBottom: '1rem' }}>
      <div className="d-flex-between mb-1" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <strong style={{ color: '#fff' }}>{label}</strong>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{current} / {max}</span>
      </div>
      <div className="progress-bg" style={{ width: '100%', height: '12px', backgroundColor: 'var(--bg-main)', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
         <div className="progress-fill" style={{ width: `${percentage}%`, height: '100%', backgroundColor: colorVar, transition: 'width 0.5s ease', boxShadow: `0 0 10px ${colorVar}` }}></div>
      </div>
    </div>
  );
};

const UserPage = () => {
  const { setUserName, setUserHospitalStatus } = useDataContext();
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (getApiKey()) {
      loadData();
    } else {
      setError("API Key is missing. Please configure it in the Faction Page.");
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserData();
      console.log('User Data:', data);
      setUser(data.user || data);
      
      if (data.name) {
        setUserName(data.name);
      }
      
      if (data.life) {
        // Calculate ratio of health missing (0 = full health, 1.0 = dead/hospital)
        const damageRatio = data.life.maximum > 0 ? 1 - (data.life.current / data.life.maximum) : 0;
        setUserHospitalStatus(damageRatio);
      } else if (data.status?.state === 'Hospital') {
        setUserHospitalStatus(1.0);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (error && error.includes("missing")) {
     return (
        <div className="page-container config-container">
          <div className="config-card glow-panel">
            <h2><span className="accent-text">System</span> Authorization Needed</h2>
            <p>{error}</p>
          </div>
        </div>
     );
  }

  return (
    <div className="page-container">
      <div className="page-header d-flex-between">
        <div>
          <h1>User Telemetry :: <span className="accent-text">{user?.name || 'Loading...'}</span></h1>
          <p>Level: {user?.level || 'N/A'} | Status: {user?.status?.description || 'N/A'}</p>
        </div>
        <button onClick={loadData} className="action-button small" disabled={loading}>
          {loading ? 'Syncing...' : 'Force Sync'}
        </button>
      </div>

      {error ? (
         <div className="error-message mb-4">Error: {error}</div>
      ) : loading && !user ? (
        <div className="text-center py-4">Establishing connection...</div>
      ) : user ? (
        <>
          <div className="metrics-grid">
            <div className="metric-card">
              <h3>Player ID</h3>
              <div className="metric-value">{user?.player_id || 'N/A'}</div>
            </div>
            <div className="metric-card">
              <h3>Age (Days)</h3>
              <div className="metric-value">{user?.age?.toLocaleString() || '0'}</div>
            </div>
            <div className="metric-card">
              <h3>Rank</h3>
              <div className="metric-value" style={{ fontSize: '1.5rem', lineHeight: '2.5rem' }}>{user?.rank || 'N/A'}</div>
            </div>
          </div>

          <div className="data-table-container glow-panel">
            <div className="table-header">
              <h2>Basic Status Overview</h2>
            </div>
            <div className="table-responsive" style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                   <h4 className="accent-text mb-4">Vital Signs</h4>
                   <ProgressBar label="Life" current={user?.life?.current || 0} max={user?.life?.maximum || 0} colorVar="var(--hp-life)" />
                   <ProgressBar label="Energy" current={user?.energy?.current || 0} max={user?.energy?.maximum || 0} colorVar="var(--hp-energy)" />
                   <ProgressBar label="Nerve" current={user?.nerve?.current || 0} max={user?.nerve?.maximum || 0} colorVar="var(--hp-nerve)" />
                   <ProgressBar label="Happy" current={user?.happy?.current || 0} max={user?.happy?.maximum || 0} colorVar="var(--hp-happy)" />
                </div>
                <div>
                   <h4 className="accent-text mb-4">Current Employment</h4>
                   <p><strong>Job:</strong> {user?.job?.name || 'Unemployed'}</p>
                   <p><strong>Position:</strong> {user?.job?.position || 'N/A'}</p>
                   
                   <h4 className="accent-text mb-4" style={{marginTop: '20px'}}>Faction Affiliation</h4>
                   <p><strong>Faction:</strong> {user?.faction?.name || 'None'}</p>
                   <p><strong>Position:</strong> {user?.faction?.position || 'N/A'}</p>
                   <p><strong>Days:</strong> {user?.faction?.days_in_faction || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default UserPage;
