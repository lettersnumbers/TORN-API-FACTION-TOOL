import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Shield, User, Settings, Menu, X, Zap, ChevronLeft, ChevronRight, BarChart2 } from 'lucide-react';
import { useDataContext } from '../context/DataContext';
import { fetchUserSpecific, fetchFactionData } from '../services/api';
import './Layout.css';

// ── Helpers ──────────────────────────────────────────────────────────────────
const nameToColor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 70%, 55%)`;
};

// TCT Clock — Torn City Time is UTC
const TCTClock = ({ mini = false }) => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const pad = (n) => String(n).padStart(2, '0');
  if (mini) {
    return (
      <div className="tct-clock-mini">
        {pad(time.getUTCHours())}:{pad(time.getUTCMinutes())}
        <span style={{ fontSize: '0.5rem', opacity: 0.6, marginLeft: 2 }}>UTC</span>
      </div>
    );
  }
  return (
    <div className="tct-clock">
      <div className="tct-clock-label">TCT // UTC</div>
      <div className="tct-clock-time">
        {pad(time.getUTCHours())}:{pad(time.getUTCMinutes())}:{pad(time.getUTCSeconds())}
      </div>
    </div>
  );
};

// ── Collapsed tooltip wrapper ─────────────────────────────────────────────────
const NavTooltip = ({ label, children, isCollapsed }) => {
  if (!isCollapsed) return children;
  return (
    <div className="nav-tooltip-wrap">
      {children}
      <div className="nav-tooltip">{label}</div>
    </div>
  );
};

// ── Main Layout ──────────────────────────────────────────────────────────────
const Layout = ({ children }) => {
  const location = useLocation();
  const { userName, factionName, hospitalCount, userHospitalStatus } = useDataContext();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(
    () => localStorage.getItem('tornSidebarCollapsed') === 'true'
  );
  const [topbarData, setTopbarData] = useState(null);

  // Touch refs for swipe
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  // Close mobile nav on route change
  useEffect(() => { setIsMobileOpen(false); }, [location.pathname]);

  // Persist collapse
  useEffect(() => {
    localStorage.setItem('tornSidebarCollapsed', String(isCollapsed));
    document.documentElement.setAttribute('data-sidebar', isCollapsed ? 'collapsed' : 'expanded');
  }, [isCollapsed]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') { e.preventDefault(); setIsCollapsed(c => !c); }
      if (e.key === 'Escape') setIsMobileOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Swipe gesture
  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);
  const handleTouchEnd = useCallback((e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    if (dy > Math.abs(dx) * 1.2) { touchStartX.current = null; return; }
    if (!isMobileOpen && touchStartX.current < 32 && dx > 60) setIsMobileOpen(true);
    else if (isMobileOpen && dx < -60) setIsMobileOpen(false);
    touchStartX.current = null;
  }, [isMobileOpen]);

  // Topbar data (live bars + chain)
  useEffect(() => {
    let active = true;
    const fetch_ = async () => {
      try {
        const [uRes, fRes] = await Promise.all([
          fetchUserSpecific('basic,bars').catch(() => null),
          fetchFactionData('').catch(() => null),
        ]);
        if (!active) return;
        const b = uRes?.bars || uRes || {};
        setTopbarData({
          name:   uRes?.name  || userName || 'Unknown',
          life:   b.life,
          energy: b.energy,
          nerve:  b.nerve,
          happy:  b.happy,
          chain:  fRes?.chain || fRes?.basic?.chain || null,
        });
      } catch {}
    };
    fetch_();
    const id = setInterval(fetch_, 30000);
    return () => { active = false; clearInterval(id); };
  }, [userName]);

  // Derived
  const baseIntensity = Math.min(0.05 + (hospitalCount * 0.02) + (userHospitalStatus * 0.4), 0.6);
  const blurRadius    = Math.min(100 + (hospitalCount * 10) + (userHospitalStatus * 200), 500);
  const layoutStyle   = (hospitalCount > 0 || userHospitalStatus > 0)
    ? { boxShadow: `inset 0 0 ${blurRadius}px rgba(220, 38, 38, ${baseIntensity})`, transition: 'box-shadow 2s ease-in-out' }
    : { transition: 'box-shadow 2s ease-in-out' };

  const userInitials = (userName || 'U').slice(0, 2).toUpperCase();
  const userColor    = nameToColor(userName || '');
  const chainCount   = topbarData?.chain?.current || 0;
  const chainActive  = chainCount > 0;

  const isOnFaction = (ia) => ia || ['/', '/faction'].some(p => location.pathname === p || location.pathname.startsWith('/faction'));
  const isOnUser    = (ia) => ia || location.pathname.startsWith('/user');

  const closeNav = () => setIsMobileOpen(false);
  const handleLogout = () => {
    import('../services/api').then(({ removeApiKey, removeFactionId }) => {
      removeApiKey(); removeFactionId(); window.location.href = '/';
    });
  };

  // ── Sub-nav items ────────────────────────────────────────────────────────
  const factionSubItems = [
    { to: '/',                   label: 'Roster',        end: true },
    { to: '/faction/war-room',   label: 'War Room' },
    { to: '/faction/attacks',    label: 'Attack Log' },
    { to: '/faction/armory',     label: 'Armory' },
    { to: '/faction/funds',      label: 'Faction Funds' },
    { to: '/faction/past-wars',  label: 'Past Wars' },
    { to: '/faction/battle-stats', label: 'Battle Stats' },
  ];
  const userSubItems = [
    { to: '/user',              label: 'Profile & Vitals', end: true },
    { to: '/user/crimes',       label: 'Crimes & Skill' },
    { to: '/user/stats',        label: 'Personal Stats' },
    { to: '/user/travel',       label: 'Flight & Travel' },
    { to: '/user/battle-stats', label: 'Battle Stats' },
  ];

  return (
    <div
      className={`layout-container${isCollapsed ? ' sidebar-collapsed' : ''}${hospitalCount > 0 ? ' hospital-alert' : ''}`}
      style={layoutStyle}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Mobile top bar ──────────────────────────────────────────────── */}
      <div className="mobile-header">
        <button className="mobile-menu-btn" onClick={() => setIsMobileOpen(o => !o)} aria-label="Toggle menu">
          {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <div className="mobile-header-brand">
          <div className="logo-glow" style={{ width: 10, height: 10 }} />
          <h2>TORN<span>TECH</span></h2>
        </div>
        <TCTClock mini />
      </div>

      {/* Backdrop */}
      {isMobileOpen && <div className="mobile-backdrop" onClick={closeNav} />}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className={`sidebar${isMobileOpen ? ' open' : ''}`} aria-label="Navigation">
        <div className="sidebar-header">
          <div className="logo-glow" />
          {!isCollapsed && <h2>TORN<span>TECH</span></h2>}
          {/* Desktop collapse toggle (inline header) */}
          <button
            className="sidebar-collapse-btn"
            onClick={() => setIsCollapsed(c => !c)}
            title={isCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        <nav className="nav-menu" style={{ overflowY: 'auto', overflowX: 'hidden' }}>
          {/* Faction section */}
          <div className="nav-section">
            {!isCollapsed && <div className="nav-section-label">Faction Ops</div>}
            <NavTooltip label={factionName} isCollapsed={isCollapsed}>
              <NavLink
                to="/"
                onClick={closeNav}
                className={({ isActive }) => isOnFaction(isActive) ? 'nav-item active' : 'nav-item'}
                title={isCollapsed ? factionName : undefined}
              >
                <Shield size={18} />
                {!isCollapsed && <span>{factionName}</span>}
              </NavLink>
            </NavTooltip>
            {!isCollapsed && (
              <div className="sub-menu">
                {factionSubItems.map(({ to, label, end }) => (
                  <NavLink key={to} to={to} end={end} onClick={closeNav}
                    className={({ isActive }) => isActive ? 'sub-item active' : 'sub-item'}>
                    {label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>

          {/* User section */}
          <div className="nav-section">
            {!isCollapsed && <div className="nav-section-label">Agent Profile</div>}
            <NavTooltip label={userName} isCollapsed={isCollapsed}>
              <NavLink
                to="/user"
                onClick={closeNav}
                className={({ isActive }) => isOnUser(isActive) ? 'nav-item active' : 'nav-item'}
                title={isCollapsed ? userName : undefined}
              >
                <User size={18} />
                {!isCollapsed && <span>{userName}</span>}
              </NavLink>
            </NavTooltip>
            {!isCollapsed && (
              <div className="sub-menu">
                {userSubItems.map(({ to, label, end }) => (
                  <NavLink key={to} to={to} end={end} onClick={closeNav}
                    className={({ isActive }) => isActive ? 'sub-item active' : 'sub-item'}>
                    {label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>

          {/* Battle Stats shortcut (icon-only in collapsed) */}
          {isCollapsed && (
            <NavTooltip label="Battle Stats" isCollapsed>
              <NavLink to="/faction/battle-stats" onClick={closeNav}
                className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
                title="Battle Stats">
                <BarChart2 size={18} />
              </NavLink>
            </NavTooltip>
          )}
        </nav>

        <div className="sidebar-footer">
          {!isCollapsed && <TCTClock />}
          {isCollapsed && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <TCTClock mini />
            </div>
          )}
          <button className="settings-btn" onClick={handleLogout}>
            <Settings size={16} />
            {!isCollapsed && <span>Logout / Config</span>}
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="main-content">
        <header className="topbar">
          {/* Desktop collapse toggle in topbar (icon) */}
          <button
            className="topbar-collapse-btn"
            onClick={() => setIsCollapsed(c => !c)}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Menu size={18} />
          </button>

          <div className="status-indicator">
            <span className="pulse-dot" />
            <span className="status-text">Online</span>
          </div>

          {/* Stat bars */}
          <div className="topbar-bars">
            {topbarData && [
              { label: 'LIFE',   data: topbarData.life,   color: '#3b82f6' },
              { label: 'ENERGY', data: topbarData.energy, color: '#10b981' },
              { label: 'NERVE',  data: topbarData.nerve,  color: '#ef4444' },
              { label: 'HAPPY',  data: topbarData.happy,  color: '#f59e0b' },
            ].map(bar => {
              if (!bar.data) return null;
              const pct = bar.data.maximum > 0
                ? Math.min(100, Math.max(0, (bar.data.current / bar.data.maximum) * 100)) : 0;
              return (
                <div key={bar.label} className="topbar-bar-item">
                  <div className="topbar-bar-label">
                    <span>{bar.label}</span>
                    <span className="topbar-bar-value" style={{ color: bar.color }}>
                      {bar.data.current}<span className="topbar-bar-max">/{bar.data.maximum}</span>
                    </span>
                  </div>
                  <div className="topbar-bar-track">
                    <div className="topbar-bar-fill" style={{ width: `${pct}%`, background: bar.color, boxShadow: `0 0 8px ${bar.color}80` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chain */}
          {chainActive && (
            <div className="chain-indicator">
              <Zap size={11} style={{ color: '#f59e0b' }} />
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, gap: 1 }}>
                <span className="chain-label">CHAIN</span>
                <span className="chain-indicator-count">{chainCount.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Avatar */}
          <div className="topbar-avatar" style={{ background: userColor }}>
            {userInitials}
          </div>
        </header>

        <div className="content-area">
          {children}
        </div>
      </main>

      {/* ── Mobile bottom nav (xs screens) ──────────────────────────────── */}
      <nav className="mobile-bottom-nav" aria-label="Quick navigation">
        <NavLink to="/" className={({ isActive }) => isOnFaction(isActive) ? 'bottom-nav-item active' : 'bottom-nav-item'}>
          <Shield size={20} />
          <span>Faction</span>
        </NavLink>
        <NavLink to="/user" className={({ isActive }) => isOnUser(isActive) ? 'bottom-nav-item active' : 'bottom-nav-item'}>
          <User size={20} />
          <span>Profile</span>
        </NavLink>
        <NavLink to="/faction/battle-stats" className={({ isActive }) => isActive ? 'bottom-nav-item active' : 'bottom-nav-item'}>
          <BarChart2 size={20} />
          <span>Stats</span>
        </NavLink>
        <button className="bottom-nav-item" onClick={handleLogout}>
          <Settings size={20} />
          <span>Config</span>
        </button>
      </nav>
    </div>
  );
};

export default Layout;
