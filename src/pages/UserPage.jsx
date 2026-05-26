import React, { useState, useEffect, useCallback } from 'react';
import { fetchUserData, fetchUserSpecific, getApiKey, saveUserStats } from '../services/api';
import { useDataContext } from '../context/DataContext';
import './FactionPage.css';

// Avatar with graceful fallback to color-hashed initials
const PlayerAvatar = ({ playerId, name, size = 80 }) => {
  const [imgError, setImgError] = useState(false);
  const color = (() => {
    let h = 0;
    for (let i = 0; i < (name || '').length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return `hsl(${Math.abs(h) % 360}, 65%, 50%)`;
  })();
  const initials = (name || 'U').slice(0, 2).toUpperCase();

  if (imgError || !playerId) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: `radial-gradient(circle at 35% 35%, ${color}cc, ${color}66)`,
        border: '2px solid rgba(0,240,255,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.3, fontWeight: '700', color: '#fff',
        fontFamily: 'var(--font-heading)', letterSpacing: '1px',
        boxShadow: '0 0 20px rgba(0,240,255,0.15)', flexShrink: 0
      }}>
        {initials}
      </div>
    );
  }
  return (
    <img
      src={`https://avatars.torn.com/avatars/${playerId}_small.jpg`}
      alt={name}
      onError={() => setImgError(true)}
      style={{
        width: size, height: size, borderRadius: '50%',
        border: '2px solid rgba(0,240,255,0.3)',
        objectFit: 'cover',
        boxShadow: '0 0 20px rgba(0,240,255,0.15)', flexShrink: 0
      }}
      loading="lazy"
    />
  );
};

// SVG arc progress indicator — no library needed
const ArcBar = ({ label, current, max, color }) => {
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0;
  const r = 30;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <div style={{ position: 'relative', width: 80, height: 80 }}>
        <svg width={80} height={80} viewBox="0 0 70 70">
          <circle cx="35" cy="35" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
          <circle
            cx="35" cy="35" r={r} fill="none"
            stroke={color} strokeWidth="5"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
            transform="rotate(-90 35 35)"
            style={{ filter: `drop-shadow(0 0 4px ${color})`, transition: 'stroke-dasharray 0.6s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center'
        }}>
          <span style={{ fontSize: '0.85rem', fontFamily: 'Orbitron, monospace', fontWeight: '700', color: '#fff', lineHeight: 1 }}>{current}</span>
          <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>/{max}</span>
        </div>
      </div>
      <span style={{ fontSize: '0.6rem', letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'var(--font-heading)', color: color, textShadow: `0 0 6px ${color}80` }}>{label}</span>
    </div>
  );
};

const UserPage = () => {
  const { setUserName, setUserHospitalStatus } = useDataContext();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [shareStatus, setShareStatus] = useState('idle'); // idle | sharing | success | error
  const [lastShared, setLastShared] = useState(() => localStorage.getItem('lastStatsShared') || null);

  // Teal/emerald theme for the user section
  useEffect(() => {
    document.documentElement.style.setProperty('--accent-primary', '#00f5d4');
    document.documentElement.style.setProperty('--accent-secondary', '#0891b2');
    document.documentElement.style.setProperty('--accent-glow', 'rgba(0, 245, 212, 0.35)');
    document.documentElement.style.setProperty('--bg-main', 'radial-gradient(ellipse at 30% 0%, #001a18 0%, #000508 60%)');
    return () => {
      document.documentElement.style.setProperty('--accent-primary', '#00f0ff');
      document.documentElement.style.setProperty('--accent-secondary', '#ff003c');
      document.documentElement.style.setProperty('--accent-glow', 'rgba(0, 240, 255, 0.35)');
      document.documentElement.style.setProperty('--bg-main', 'radial-gradient(ellipse at 20% 0%, #001a2e 0%, #000508 45%, #050010 100%)');
    };
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserData();
      const userData = data.user || data;
      setUser(userData);
      if (data.name) setUserName(data.name);
      if (data.life) {
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
  }, [setUserName, setUserHospitalStatus]);

  useEffect(() => {
    if (getApiKey()) loadData();
    else setError('API Key is missing. Please configure it in the Faction Page.');
  }, [loadData]);

  const handleShareStats = async () => {
    if (!user || shareStatus === 'sharing') return;
    setShareStatus('sharing');
    try {
      const statsData = await fetchUserSpecific('personalstats');
      const ps = statsData.personalstats || statsData;
      await saveUserStats({
        player_id: user.player_id,
        name: user.name,
        level: user.level,
        stats: {
          strength: ps.strength || 0,
          defense: ps.defense || 0,
          speed: ps.speed || 0,
          dexterity: ps.dexterity || 0,
          total: ps.total || 0,
          attacks_won: ps.attacks_won || 0,
          defends_won: ps.defends_won || 0,
        }
      });
      const now = new Date().toISOString();
      localStorage.setItem('lastStatsShared', now);
      setLastShared(now);
      setShareStatus('success');
      setTimeout(() => setShareStatus('idle'), 3000);
    } catch (err) {
      console.warn('Share stats failed:', err.message);
      setShareStatus('error');
      setTimeout(() => setShareStatus('idle'), 3000);
    }
  };

  if (error && error.includes('missing')) {
    return (
      <div className="page-container config-container">
        <div className="config-card glow-panel">
          <h2><span className="accent-text">System</span> Authorization Needed</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const stateLC = user?.status?.state?.toLowerCase();

  return (
    <div className="page-container">
      <div className="page-header d-flex-between" style={{ alignItems: 'flex-start' }}>
        <div>
          <h1>Agent Telemetry :: <span className="accent-text">{user?.name || 'Loading...'}</span></h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '0.9rem' }}>
            Level {user?.level || '—'} &nbsp;·&nbsp; {user?.rank || '—'} &nbsp;·&nbsp; Age: {user?.age?.toLocaleString() || '—'} days
          </p>
        </div>
        <button onClick={loadData} className="action-button small" disabled={loading}>
          {loading ? 'Syncing...' : 'Force Sync'}
        </button>
      </div>

      {error && <div className="error-message mb-4">Error: {error}</div>}

      {loading && !user ? (
        <div className="text-center py-4" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', letterSpacing: '3px', fontSize: '0.75rem' }}>
          INITIALIZING TELEMETRY...
        </div>
      ) : user ? (
        <>
          {/* Hero Card */}
          <div className="glow-panel" style={{ padding: '28px', marginBottom: '24px', display: 'flex', gap: '28px', alignItems: 'center', flexWrap: 'wrap' }}>
            <PlayerAvatar playerId={user.player_id} name={user.name} size={88} />
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <h2 style={{ fontSize: '1.6rem', letterSpacing: '3px', margin: 0 }}>{user.name}</h2>
                <span className={`status-badge ${stateLC || 'okay'}`}>
                  {user.status?.description || user.status?.state || 'Okay'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '10px' }}>
                {[
                  { label: 'PLAYER ID', val: `#${user.player_id || '—'}` },
                  { label: 'FACTION', val: user.faction?.name || 'None' },
                  { label: 'POSITION', val: user.faction?.position || 'N/A' },
                  { label: 'JOB', val: user.job?.name || 'Unemployed' },
                ].map(({ label, val }) => (
                  <div key={label}>
                    <div style={{ fontSize: '0.6rem', letterSpacing: '2px', color: 'rgba(0,245,212,0.5)', fontFamily: 'var(--font-heading)', marginBottom: '2px' }}>{label}</div>
                    <div style={{ fontSize: '0.9rem', color: '#fff', fontFamily: 'var(--font-heading)' }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
              <button
                onClick={handleShareStats}
                disabled={shareStatus === 'sharing'}
                className={`share-stats-btn ${shareStatus === 'success' ? 'success' : ''}`}
              >
                {shareStatus === 'sharing' ? '⟳ Sharing...' : shareStatus === 'success' ? '✓ Shared!' : shareStatus === 'error' ? '✗ Failed' : '⬆ Share Stats with Faction'}
              </button>
              {lastShared && (
                <div className="share-timestamp">Last shared: {new Date(lastShared).toLocaleString()}</div>
              )}
            </div>
          </div>

          {/* Arc Vitals */}
          <div className="glow-panel" style={{ padding: '28px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '0.7rem', letterSpacing: '3px', color: 'rgba(0,245,212,0.5)', fontFamily: 'var(--font-heading)', marginBottom: '24px' }}>
              Vital Telemetry
            </h3>
            <div style={{ display: 'flex', gap: '32px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <ArcBar label="Life"   current={user.life?.current   || 0} max={user.life?.maximum   || 100} color="#3b82f6" />
              <ArcBar label="Energy" current={user.energy?.current || 0} max={user.energy?.maximum || 100} color="#10b981" />
              <ArcBar label="Nerve"  current={user.nerve?.current  || 0} max={user.nerve?.maximum  || 100} color="#ef4444" />
              <ArcBar label="Happy"  current={user.happy?.current  || 0} max={user.happy?.maximum  || 100} color="#f59e0b" />
            </div>
          </div>

          {/* Metric Cards */}
          <div className="metrics-grid">
            <div className="metric-card">
              <h3>Player ID</h3>
              <div className="metric-value" style={{ fontSize: '1.6rem' }}>#{user.player_id || '—'}</div>
            </div>
            <div className="metric-card">
              <h3>Account Age</h3>
              <div className="metric-value" style={{ fontSize: '1.6rem' }}>{(user.age || 0).toLocaleString()}</div>
              <div className="text-muted mt-1" style={{ fontSize: '0.8rem' }}>days active</div>
            </div>
            <div className="metric-card">
              <h3>Rank</h3>
              <div className="metric-value" style={{ fontSize: '1.1rem', lineHeight: '2.5rem' }}>{user.rank || '—'}</div>
            </div>
            <div className="metric-card">
              <h3>Days in Faction</h3>
              <div className="metric-value" style={{ fontSize: '1.6rem' }}>{(user.faction?.days_in_faction || 0).toLocaleString()}</div>
              <div className="text-muted mt-1" style={{ fontSize: '0.8rem' }}>as {user.faction?.position || 'Member'}</div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default UserPage;
