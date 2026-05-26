import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Shield, User, Settings, Menu, X, Link, Zap } from 'lucide-react';
import { useDataContext } from '../context/DataContext';
import { fetchUserSpecific, fetchFactionData } from '../services/api';
import './Layout.css';

// Utility: generate a deterministic color from a string
const nameToColor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 70%, 55%)`;
};

// TCT Clock — Torn City Time is UTC
const TCTClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const pad = (n) => String(n).padStart(2, '0');
  return (
    <div className="tct-clock">
      <div className="tct-clock-label">TCT // UTC</div>
      <div className="tct-clock-time">
        {pad(time.getUTCHours())}:{pad(time.getUTCMinutes())}:{pad(time.getUTCSeconds())}
      </div>
    </div>
  );
};

const Layout = ({ children }) => {
  const { userName, factionName, hospitalCount, userHospitalStatus } = useDataContext();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [topbarData, setTopbarData] = useState(null);

  useEffect(() => {
    let active = true;
    const fetchTopbarData = async () => {
      try {
        const uRes = await fetchUserSpecific('basic,bars').catch(() => null);
        const fRes = await fetchFactionData('').catch(() => null);
        if (!active) return;
        const b = uRes?.bars || uRes || {};
        setTopbarData({
          name: uRes?.name || userName || 'Unknown',
          life: b.life,
          energy: b.energy,
          nerve: b.nerve,
          happy: b.happy,
          chain: fRes?.chain || fRes?.basic?.chain || null
        });
      } catch (e) {}
    };
    fetchTopbarData();
    const interval = setInterval(fetchTopbarData, 30000);
    return () => { active = false; clearInterval(interval); };
  }, [userName]);

  const baseIntensity = Math.min(0.05 + (hospitalCount * 0.02) + (userHospitalStatus * 0.4), 0.6);
  const blurRadius = Math.min(100 + (hospitalCount * 10) + (userHospitalStatus * 200), 500);

  const layoutStyle = (hospitalCount > 0 || userHospitalStatus > 0)
    ? { boxShadow: `inset 0 0 ${blurRadius}px rgba(220, 38, 38, ${baseIntensity})`, transition: 'box-shadow 2s ease-in-out' }
    : { transition: 'box-shadow 2s ease-in-out' };

  const userInitials = (userName || 'U').slice(0, 2).toUpperCase();
  const userColor = nameToColor(userName || '');
  const chainCount = topbarData?.chain?.current || 0;
  const chainActive = chainCount > 0;

  const isOnFaction = (isActive) => isActive || window.location.pathname === '/' || window.location.pathname.startsWith('/faction');
  const isOnUser = (isActive) => isActive || window.location.pathname.startsWith('/user');

  return (
    <div className={`layout-container ${hospitalCount > 0 ? 'hospital-alert' : ''}`} style={layoutStyle}>
      {/* Mobile Top Header */}
      <div className="mobile-header">
        <div className="mobile-header-brand">
          <div className="logo-glow" style={{ width: '16px', height: '16px' }}></div>
          <h2>TORN<span>TECH</span></h2>
        </div>
        <button className="mobile-menu-btn" onClick={() => setIsMobileOpen(!isMobileOpen)}>
          {isMobileOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {isMobileOpen && (
        <div className="mobile-backdrop" onClick={() => setIsMobileOpen(false)}></div>
      )}

      <aside className={`sidebar ${isMobileOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-glow"></div>
          <h2>TORN<span>TECH</span></h2>
        </div>

        <nav className="nav-menu">
          <div className="nav-section" style={{ marginBottom: '8px' }}>
            <div className="nav-section-label">Faction Operations</div>
            <NavLink
              to="/"
              onClick={() => setIsMobileOpen(false)}
              className={({ isActive }) => isOnFaction(isActive) ? 'nav-item active' : 'nav-item'}
            >
              <Shield size={18} />
              <span>{factionName}</span>
            </NavLink>
            <div className="sub-menu">
              <NavLink to="/" end onClick={() => setIsMobileOpen(false)} className={({ isActive }) => isActive ? 'sub-item active' : 'sub-item'}>Roster</NavLink>
              <NavLink to="/faction/war-room" onClick={() => setIsMobileOpen(false)} className={({ isActive }) => isActive ? 'sub-item active' : 'sub-item'}>War Room</NavLink>
              <NavLink to="/faction/attacks" onClick={() => setIsMobileOpen(false)} className={({ isActive }) => isActive ? 'sub-item active' : 'sub-item'}>Attack Log</NavLink>
              <NavLink to="/faction/armory" onClick={() => setIsMobileOpen(false)} className={({ isActive }) => isActive ? 'sub-item active' : 'sub-item'}>Armory</NavLink>
              <NavLink to="/faction/funds" onClick={() => setIsMobileOpen(false)} className={({ isActive }) => isActive ? 'sub-item active' : 'sub-item'}>Faction Funds</NavLink>
              <NavLink to="/faction/past-wars" onClick={() => setIsMobileOpen(false)} className={({ isActive }) => isActive ? 'sub-item active' : 'sub-item'}>Past Wars</NavLink>
            </div>
          </div>

          <div className="nav-section">
            <div className="nav-section-label">Agent Profile</div>
            <NavLink
              to="/user"
              onClick={() => setIsMobileOpen(false)}
              className={({ isActive }) => isOnUser(isActive) ? 'nav-item active' : 'nav-item'}
            >
              <User size={18} />
              <span>{userName}</span>
            </NavLink>
            <div className="sub-menu">
              <NavLink to="/user" end onClick={() => setIsMobileOpen(false)} className={({ isActive }) => isActive ? 'sub-item active' : 'sub-item'}>Profile & Vitals</NavLink>
              <NavLink to="/user/crimes" onClick={() => setIsMobileOpen(false)} className={({ isActive }) => isActive ? 'sub-item active' : 'sub-item'}>Crimes & Skill</NavLink>
              <NavLink to="/user/stats" onClick={() => setIsMobileOpen(false)} className={({ isActive }) => isActive ? 'sub-item active' : 'sub-item'}>Personal Stats</NavLink>
              <NavLink to="/user/travel" onClick={() => setIsMobileOpen(false)} className={({ isActive }) => isActive ? 'sub-item active' : 'sub-item'}>Flight & Travel</NavLink>
              <NavLink to="/user/battle-stats" onClick={() => setIsMobileOpen(false)} className={({ isActive }) => isActive ? 'sub-item active' : 'sub-item'}>Battle Stats</NavLink>
            </div>
          </div>
        </nav>

        <div className="sidebar-footer">
          <TCTClock />
          <button className="settings-btn" onClick={() => {
            import('../services/api').then(({ removeApiKey, removeFactionId }) => {
              removeApiKey();
              removeFactionId();
              window.location.href = '/';
            });
          }}>
            <Settings size={16} />
            <span>Logout / Config</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="status-indicator" style={{ whiteSpace: 'nowrap' }}>
            <span className="pulse-dot"></span>
            System Online
          </div>

          <div style={{ display: 'flex', alignItems: 'center', flex: 1, paddingLeft: '24px', paddingRight: '8px', gap: '12px' }}>
            {topbarData && (
              <div style={{ display: 'flex', gap: '20px', flex: 1 }}>
                {[
                  { label: 'LIFE', data: topbarData.life, color: '#3b82f6' },
                  { label: 'ENERGY', data: topbarData.energy, color: '#10b981' },
                  { label: 'NERVE', data: topbarData.nerve, color: '#ef4444' },
                  { label: 'HAPPY', data: topbarData.happy, color: '#f59e0b' }
                ].map(bar => {
                  if (!bar.data) return null;
                  const pct = bar.data.maximum > 0 ? Math.min(100, Math.max(0, (bar.data.current / bar.data.maximum) * 100)) : 0;
                  return (
                    <div key={bar.label} style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.65rem', color: 'rgba(0,240,255,0.6)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px', fontFamily: 'var(--font-heading)' }}>{bar.label}</span>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', fontFamily: 'Orbitron, monospace' }}>{bar.data.current}<span style={{ fontSize: '0.6rem', opacity: 0.4 }}>/{bar.data.maximum}</span></span>
                      </div>
                      <div style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: bar.color, boxShadow: `0 0 8px ${bar.color}80`, transition: 'width 0.6s ease-out', borderRadius: '2px' }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Chain Counter */}
            {chainActive && (
              <div className="chain-indicator">
                <Zap size={12} style={{ color: '#f59e0b' }} />
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                  <span className="chain-label">CHAIN</span>
                  <span className="chain-indicator-count">{chainCount.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* User Avatar */}
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: userColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '700', color: '#fff', fontFamily: 'var(--font-heading)', letterSpacing: '0.5px', border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0, marginLeft: '12px' }}>
            {userInitials}
          </div>
        </header>

        <div className="content-area">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
