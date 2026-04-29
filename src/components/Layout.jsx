import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Shield, User, Settings, Menu, X } from 'lucide-react';
import { useDataContext } from '../context/DataContext';
import { fetchUserSpecific, fetchFactionData } from '../services/api';
import './Layout.css';

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

  // Combine faction alarms with user damage
  const baseIntensity = Math.min(0.05 + (hospitalCount * 0.02) + (userHospitalStatus * 0.4), 0.6);
  const blurRadius = Math.min(100 + (hospitalCount * 10) + (userHospitalStatus * 200), 500);

  // Dynamic background style based on hospital count and user damage
  const layoutStyle = (hospitalCount > 0 || userHospitalStatus > 0)
    ? {
        boxShadow: `inset 0 0 ${blurRadius}px rgba(220, 38, 38, ${baseIntensity})`,
        transition: 'box-shadow 2s ease-in-out'
      }
    : { transition: 'box-shadow 2s ease-in-out' };

  return (
    <div className={`layout-container ${hospitalCount > 0 ? 'hospital-alert' : ''}`} style={layoutStyle}>
      {/* Mobile Top Header */}
      <div className="mobile-header">
        <div className="mobile-header-brand">
          <div className="logo-glow" style={{ width: '20px', height: '20px' }}></div>
          <h2>TORN<span>TECH</span></h2>
        </div>
        <button className="mobile-menu-btn" onClick={() => setIsMobileOpen(!isMobileOpen)}>
          {isMobileOpen ? <X size={28} /> : <Menu size={28} />}
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
          <div className="nav-section mb-4">
            <NavLink to="/" onClick={() => setIsMobileOpen(false)} className={({isActive}) => isActive || window.location.pathname.startsWith('/faction') ? "nav-item active" : "nav-item"}>
              <Shield size={20} />
              <span>{factionName}</span>
            </NavLink>
            <div className="sub-menu">
              <NavLink to="/" end onClick={() => setIsMobileOpen(false)} className={({isActive}) => isActive ? "sub-item active" : "sub-item"}>{factionName}</NavLink>
              <NavLink to="/faction/war-room" onClick={() => setIsMobileOpen(false)} className={({isActive}) => isActive ? "sub-item active" : "sub-item"}>War Room</NavLink>
              <NavLink to="/faction/attacks" onClick={() => setIsMobileOpen(false)} className={({isActive}) => isActive ? "sub-item active" : "sub-item"}>Attack Log</NavLink>
              <NavLink to="/faction/armory" onClick={() => setIsMobileOpen(false)} className={({isActive}) => isActive ? "sub-item active" : "sub-item"}>Armory</NavLink>
              <NavLink to="/faction/funds" onClick={() => setIsMobileOpen(false)} className={({isActive}) => isActive ? "sub-item active" : "sub-item"}>Faction Funds</NavLink>
              <NavLink to="/faction/past-wars" onClick={() => setIsMobileOpen(false)} className={({isActive}) => isActive ? "sub-item active" : "sub-item"}>Past Wars</NavLink>
            </div>
          </div>
          
          <div className="nav-section">
            <NavLink to="/user" onClick={() => setIsMobileOpen(false)} className={({isActive}) => isActive || window.location.pathname.startsWith('/user') ? "nav-item active" : "nav-item"}>
              <User size={20} />
              <span>{userName}</span>
            </NavLink>
            <div className="sub-menu">
              <NavLink to="/user" end onClick={() => setIsMobileOpen(false)} className={({isActive}) => isActive ? "sub-item active" : "sub-item"}>Profile & Vitals</NavLink>
              <NavLink to="/user/crimes" onClick={() => setIsMobileOpen(false)} className={({isActive}) => isActive ? "sub-item active" : "sub-item"}>Crimes & Skill</NavLink>
              <NavLink to="/user/stats" onClick={() => setIsMobileOpen(false)} className={({isActive}) => isActive ? "sub-item active" : "sub-item"}>Personal Stats</NavLink>
              <NavLink to="/user/travel" onClick={() => setIsMobileOpen(false)} className={({isActive}) => isActive ? "sub-item active" : "sub-item"}>Flight & Travel</NavLink>
            </div>
          </div>
        </nav>

        <div className="sidebar-footer">
          <button className="settings-btn" onClick={() => {
            import('../services/api').then(({ removeApiKey, removeFactionId }) => {
              removeApiKey();
              removeFactionId();
              window.location.href = '/';
            });
          }}>
            <Settings size={20} />
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
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flex: 1, justifyContent: 'flex-end', overflowX: 'auto', paddingLeft: '20px' }}>
             {topbarData?.chain && topbarData.chain.current > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                   <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Chain:</span>
                   <span style={{ color: 'var(--hp-nerve)', fontWeight: 'bold' }}>{topbarData.chain.current}</span>
                   <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({topbarData.chain.timeout}s)</span>
                </div>
             )}

             {topbarData && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                   <div style={{ fontWeight: 'bold', color: 'var(--accent-primary)', whiteSpace: 'nowrap' }}>{topbarData.name}</div>
                   
                   <div style={{ display: 'flex', gap: '16px' }}>
                     {[
                       { label: 'L', data: topbarData.life, color: '#3b82f6' },
                       { label: 'E', data: topbarData.energy, color: '#10b981' },
                       { label: 'N', data: topbarData.nerve, color: '#ef4444' },
                       { label: 'H', data: topbarData.happy, color: '#f59e0b' }
                     ].map(bar => {
                        if (!bar.data) return null;
                        const pct = bar.data.maximum > 0 ? Math.min(100, Math.max(0, (bar.data.current / bar.data.maximum) * 100)) : 0;
                        return (
                          <div key={bar.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '90px' }}>
                            <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 'bold' }}>{bar.label}</span>
                            <div style={{ flex: 1, height: '4px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', backgroundColor: bar.color, boxShadow: `0 0 8px ${bar.color}`, transition: 'width 0.5s ease-out' }}></div>
                            </div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{bar.data.current}/{bar.data.maximum}</span>
                          </div>
                        );
                     })}
                   </div>
                </div>
             )}
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
