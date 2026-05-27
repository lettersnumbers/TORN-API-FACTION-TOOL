import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Shield, User, Settings, Menu, X, Zap, ChevronLeft, ChevronRight, BarChart2, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useDataContext } from '../context/DataContext';
import { fetchUserSpecific, fetchFactionData } from '../services/api';
import './Layout.css';

// ── Helpers ──────────────────────────────────────────────────────────────────
const nameToColor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 70%, 55%)`;
};

// TCT Clock
const TCTClock = ({ mini = false }) => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const pad = (n) => String(n).padStart(2, '0');
  if (mini) return (
    <div className="tct-mini">
      {pad(time.getUTCHours())}:{pad(time.getUTCMinutes())}
      <span className="tct-mini-label">UTC</span>
    </div>
  );
  return (
    <div className="tct-clock">
      <div className="tct-clock-label">TCT // UTC</div>
      <div className="tct-clock-time">
        {pad(time.getUTCHours())}:{pad(time.getUTCMinutes())}:{pad(time.getUTCSeconds())}
      </div>
    </div>
  );
};

// ── Layout ──────────────────────────────────────────────────────────────────
const Layout = ({ children }) => {
  const location = useLocation();
  const { userName, factionName, hospitalCount, userHospitalStatus } = useDataContext();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(
    () => localStorage.getItem('tornSidebarCollapsed') === 'true'
  );
  const [topbarData, setTopbarData] = useState(null);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  // Close mobile drawer on route change
  useEffect(() => { setIsMobileOpen(false); }, [location.pathname]);

  // Persist collapse state
  useEffect(() => {
    localStorage.setItem('tornSidebarCollapsed', String(isCollapsed));
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

  // Swipe to open/close on mobile
  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);
  const handleTouchEnd = useCallback((e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    if (dy > Math.abs(dx) * 1.2) { touchStartX.current = null; return; }
    if (!isMobileOpen && touchStartX.current < 40 && dx > 60) setIsMobileOpen(true);
    else if (isMobileOpen && dx < -60) setIsMobileOpen(false);
    touchStartX.current = null;
  }, [isMobileOpen]);

  // Live topbar data
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
          life: b.life, energy: b.energy, nerve: b.nerve, happy: b.happy,
          chain: fRes?.chain || fRes?.basic?.chain || null,
        });
      } catch {}
    };
    fetch_();
    const id = setInterval(fetch_, 30000);
    return () => { active = false; clearInterval(id); };
  }, [userName]);

  // Derived
  const intensity = Math.min(0.05 + (hospitalCount * 0.02) + (userHospitalStatus * 0.4), 0.6);
  const blur = Math.min(100 + (hospitalCount * 10) + (userHospitalStatus * 200), 500);
  const layoutStyle = (hospitalCount > 0 || userHospitalStatus > 0)
    ? { boxShadow: `inset 0 0 ${blur}px rgba(220,38,38,${intensity})`, transition: 'box-shadow 2s ease-in-out' }
    : { transition: 'box-shadow 2s ease-in-out' };

  const userInitials = (userName || 'U').slice(0, 2).toUpperCase();
  const userColor = nameToColor(userName || '');
  const chainCount = topbarData?.chain?.current || 0;
  const chainActive = chainCount > 0;

  const isOnFaction = () => location.pathname === '/' || location.pathname.startsWith('/faction');
  const isOnUser = () => location.pathname.startsWith('/user');

  const toggleCollapse = () => setIsCollapsed(c => !c);
  const closeNav = () => setIsMobileOpen(false);
  const handleLogout = () => {
    import('../services/api').then(({ removeApiKey, removeFactionId }) => {
      removeApiKey(); removeFactionId(); window.location.href = '/';
    });
  };

  const factionSubs = [
    { to: '/', label: 'Roster', end: true },
    { to: '/faction/war-room', label: 'War Room' },
    { to: '/faction/attacks', label: 'Attack Log' },
    { to: '/faction/armory', label: 'Armory' },
    { to: '/faction/funds', label: 'Faction Funds' },
    { to: '/faction/past-wars', label: 'Past Wars' },
    { to: '/faction/battle-stats', label: 'Battle Stats' },
  ];
  const userSubs = [
    { to: '/user', label: 'Profile & Vitals', end: true },
    { to: '/user/crimes', label: 'Crimes & Skill' },
    { to: '/user/stats', label: 'Personal Stats' },
    { to: '/user/travel', label: 'Flight & Travel' },
    { to: '/user/battle-stats', label: 'Battle Stats' },
  ];

  const BARS = [
    { label: 'LIFE',   key: 'life',   color: '#3b82f6' },
    { label: 'NRV',    key: 'nerve',  color: '#ef4444' },
    { label: 'NRG',    key: 'energy', color: '#10b981' },
    { label: 'HPS',    key: 'happy',  color: '#f59e0b' },
  ];

  return (
    <div
      className={`layout-container${isCollapsed ? ' sidebar-collapsed' : ''}${hospitalCount > 0 ? ' hospital-alert' : ''}`}
      style={layoutStyle}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Mobile top header ─────────────────────────────────────────── */}
      <header className="mobile-header">
        <button className="mobile-menu-btn" onClick={() => setIsMobileOpen(o => !o)} aria-label="Menu">
          {isMobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <div className="mobile-brand">
          <div className="logo-dot" />
          <span className="mobile-brand-name">TORN<span>TECH</span></span>
        </div>
        {/* Mini bars on mobile header */}
        <div className="mobile-bars">
          {topbarData && BARS.map(b => {
            const d = topbarData[b.key];
            if (!d) return null;
            const pct = d.maximum > 0 ? Math.min(100, (d.current / d.maximum) * 100) : 0;
            return (
              <div key={b.key} className="mobile-bar" title={`${b.label}: ${d.current}/${d.maximum}`}>
                <div className="mobile-bar-track">
                  <div className="mobile-bar-fill" style={{ width: `${pct}%`, background: b.color }} />
                </div>
                <span className="mobile-bar-label" style={{ color: b.color }}>{b.label}</span>
              </div>
            );
          })}
        </div>
        <TCTClock mini />
      </header>

      {/* Backdrop */}
      {isMobileOpen && <div className="mobile-backdrop" onClick={closeNav} aria-hidden="true" />}

      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <aside className={`sidebar${isMobileOpen ? ' open' : ''}`} aria-label="Navigation">
        {/* Header */}
        <div className="sidebar-header">
          <div className="logo-dot" style={{ width: 12, height: 12 }} />
          {!isCollapsed && <h2 className="sidebar-title">TORN<span>TECH</span></h2>}
          <button
            className="collapse-toggle"
            onClick={toggleCollapse}
            title={isCollapsed ? 'Expand  (Ctrl+B)' : 'Collapse (Ctrl+B)'}
          >
            {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">

          {/* Faction */}
          <div className="nav-group">
            {!isCollapsed && <div className="nav-group-label">Faction Ops</div>}
            <div className={`nav-item-wrap${isCollapsed ? ' tooltip-wrap' : ''}`}>
              <NavLink
                to="/"
                onClick={closeNav}
                className={() => isOnFaction() ? 'nav-item active' : 'nav-item'}
                title={isCollapsed ? factionName : undefined}
              >
                <Shield size={17} className="nav-icon" />
                {!isCollapsed && <span className="nav-label">{factionName}</span>}
              </NavLink>
              {isCollapsed && <div className="nav-tip">{factionName}</div>}
            </div>
            {!isCollapsed && (
              <div className="sub-menu">
                {factionSubs.map(({ to, label, end }) => (
                  <NavLink key={to} to={to} end={end} onClick={closeNav}
                    className={({ isActive }) => isActive ? 'sub-item active' : 'sub-item'}>
                    {label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>

          {/* User */}
          <div className="nav-group">
            {!isCollapsed && <div className="nav-group-label">Agent Profile</div>}
            <div className={`nav-item-wrap${isCollapsed ? ' tooltip-wrap' : ''}`}>
              <NavLink
                to="/user"
                onClick={closeNav}
                className={() => isOnUser() ? 'nav-item active' : 'nav-item'}
                title={isCollapsed ? userName : undefined}
              >
                <User size={17} className="nav-icon" />
                {!isCollapsed && <span className="nav-label">{userName}</span>}
              </NavLink>
              {isCollapsed && <div className="nav-tip">{userName}</div>}
            </div>
            {!isCollapsed && (
              <div className="sub-menu">
                {userSubs.map(({ to, label, end }) => (
                  <NavLink key={to} to={to} end={end} onClick={closeNav}
                    className={({ isActive }) => isActive ? 'sub-item active' : 'sub-item'}>
                    {label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>

          {/* Battle Stats icon shortcut (collapsed only) */}
          {isCollapsed && (
            <div className="nav-item-wrap tooltip-wrap">
              <NavLink to="/faction/battle-stats" onClick={closeNav}
                className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
                title="Battle Stats">
                <BarChart2 size={17} className="nav-icon" />
              </NavLink>
              <div className="nav-tip">Battle Stats</div>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          {!isCollapsed && <TCTClock />}
          {isCollapsed && <div className="collapsed-clock"><TCTClock mini /></div>}
          <button className="settings-btn" onClick={handleLogout}>
            <Settings size={15} />
            {!isCollapsed && <span>Logout / Config</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────────────── */}
      <main className="main-content">
        {/* Desktop topbar */}
        <header className="topbar">
          {/* Collapse toggle */}
          <button className="topbar-toggle" onClick={toggleCollapse} title="Toggle sidebar (Ctrl+B)">
            {isCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>

          <div className="topbar-status">
            <span className="pulse-dot" />
            <span className="status-text">Online</span>
          </div>

          {/* Stat bars */}
          <div className="topbar-bars">
            {topbarData && BARS.map(b => {
              const d = topbarData[b.key];
              if (!d) return null;
              const pct = d.maximum > 0 ? Math.min(100, (d.current / d.maximum) * 100) : 0;
              return (
                <div key={b.key} className="bar-item">
                  <div className="bar-header">
                    <span className="bar-label">{b.label}</span>
                    <span className="bar-value" style={{ color: b.color }}>
                      {d.current}<span className="bar-max">/{d.maximum}</span>
                    </span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${pct}%`, background: b.color, boxShadow: `0 0 6px ${b.color}80` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {chainActive && (
            <div className="chain-pill">
              <Zap size={11} />
              <span className="chain-count">{chainCount.toLocaleString()}</span>
            </div>
          )}

          <div className="topbar-avatar" style={{ background: userColor }}>{userInitials}</div>
        </header>

        <div className="content-area">{children}</div>
      </main>

      {/* ── Mobile bottom nav ─────────────────────────────────────────── */}
      <nav className="bottom-nav" aria-label="Quick nav">
        <NavLink to="/" className={() => isOnFaction() ? 'bnav-item active' : 'bnav-item'} onClick={closeNav}>
          <Shield size={20} /><span>Faction</span>
        </NavLink>
        <NavLink to="/user" className={() => isOnUser() ? 'bnav-item active' : 'bnav-item'} onClick={closeNav}>
          <User size={20} /><span>Profile</span>
        </NavLink>
        <NavLink to="/faction/battle-stats" className={({ isActive }) => isActive ? 'bnav-item active' : 'bnav-item'} onClick={closeNav}>
          <BarChart2 size={20} /><span>Stats</span>
        </NavLink>
        <button className="bnav-item" onClick={handleLogout}>
          <Settings size={20} /><span>Config</span>
        </button>
      </nav>
    </div>
  );
};

export default Layout;
