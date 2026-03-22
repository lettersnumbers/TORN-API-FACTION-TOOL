import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Shield, User, Settings, Menu, X } from 'lucide-react';
import { useDataContext } from '../context/DataContext';
import './Layout.css';

const Layout = ({ children }) => {
  const { userName, factionName, hospitalCount, userHospitalStatus } = useDataContext();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

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
              <NavLink to="/" end onClick={() => setIsMobileOpen(false)} className={({isActive}) => isActive ? "sub-item active" : "sub-item"}>Active Roster</NavLink>
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
          <div className="status-indicator">
            <span className="pulse-dot"></span>
            System Online
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
