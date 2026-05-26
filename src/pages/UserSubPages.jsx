import React, { useState, useEffect } from 'react';
import { useDataContext } from '../context/DataContext';
import { fetchUserSpecific, fetchUserCrimes } from '../services/api';

const useSubPageFetch = (selection) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetchUserSpecific(selection);
        setData(res);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selection]);
  return { data, loading, error };
};

const LoadingState = ({ message }) => (
  <div style={{
    textAlign: 'center', padding: '60px 20px',
    color: 'var(--text-muted)', fontFamily: 'var(--font-heading)',
    letterSpacing: '3px', fontSize: '0.75rem', textTransform: 'uppercase',
    animation: 'neon-pulse 1.5s ease-in-out infinite'
  }}>
    {message || 'SYNCING DATA...'}
  </div>
);

// ---- STAT CATEGORIES for personalstats ----
const STAT_CATEGORIES = {
  'Combat & Attacks': [
    'attacks_won', 'attacks_lost', 'attacks_draw', 'best_kill_streak', 'current_kill_streak',
    'defends_won', 'defends_lost', 'defends_draw', 'rounds_fired', 'bullets_hits',
    'unarmed_hits', 'clubbing_hits', 'slashing_hits', 'piercing_hits', 'mechanical_hits',
    'artillery_hits', 'temporary_hits', 'critical_hits', 'one_hit_kills', 'damage_dealt',
    'moneymugged', 'assassination_contracts', 'bounties_placed', 'bounties_collected',
  ],
  'Criminal Activity': [
    'nerverefills', 'medicalitemsused', 'criminaloffenses', 'jailed', 'peoplejailed',
    'peoplekicked', 'busted', 'failedbusts', 'hospital', 'networth',
  ],
  'Travel & Trading': [
    'traveled', 'traveltimes', 'itemsbought', 'itemsboughtabroad', 'points_sold', 'points_bought',
    'auctionswon', 'auctionssold', 'trades', 'tradesrev', 'bazaarcustomers', 'bazaarsales', 'bazaarprofit',
  ],
  'Character Growth': [
    'xantaken', 'exttaken', 'kettaken', 'lsdtaken', 'opitaken', 'shroomotaken',
    'speedtaken', 'pcptaken', 'viataken', 'cannataken', 'virustaken',
    'loansuccess', 'loanrecord', 'cityfinds', 'cityitemsfound', 'dumpfinds', 'dumpfindsvalue',
  ],
  'Racing & Missions': [
    'raceswon', 'racesran', 'racingskill', 'racingpointsearned',
    'missionscompleted', 'contractscompleted', 'statenhancersused',
  ],
};

const ALL_CATEGORIZED = new Set(Object.values(STAT_CATEGORIES).flat());

const StatCategory = ({ title, statKeys, dataObj }) => {
  const [open, setOpen] = useState(title === 'Combat & Attacks');
  const relevant = statKeys.filter(k => dataObj[k] !== undefined && dataObj[k] !== null);
  if (!relevant.length) return null;
  return (
    <div style={{ marginBottom: '10px', border: '1px solid rgba(0,240,255,0.08)', borderRadius: '8px', overflow: 'hidden' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '13px 20px', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', cursor: 'pointer', background: 'rgba(0,240,255,0.03)',
          userSelect: 'none', transition: 'background 0.2s'
        }}
      >
        <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.8rem', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--accent-primary)' }}>
          {title} <span style={{ opacity: 0.5, fontSize: '0.7rem' }}>({relevant.length})</span>
        </span>
        <span style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s', display: 'inline-block' }}>▾</span>
      </div>
      {open && (
        <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '10px' }}>
          {relevant.map(k => (
            <div key={k} style={{ background: 'rgba(0,240,255,0.02)', border: '1px solid rgba(0,240,255,0.06)', borderRadius: '6px', padding: '11px 13px' }}>
              <div style={{ fontSize: '0.58rem', letterSpacing: '1.5px', color: 'rgba(0,240,255,0.4)', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', marginBottom: '4px' }}>
                {k.replace(/_/g, ' ')}
              </div>
              <div style={{ fontFamily: 'Orbitron, var(--font-heading)', fontSize: '0.95rem', color: '#fff' }}>
                {typeof dataObj[k] === 'number' ? dataObj[k].toLocaleString() : String(dataObj[k])}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==========================================
export const UserStats = () => {
  const { userName } = useDataContext();
  const { data, loading, error } = useSubPageFetch('personalstats');

  useEffect(() => {
    document.documentElement.style.setProperty('--accent-primary', '#3b82f6');
    document.documentElement.style.setProperty('--accent-secondary', '#60a5fa');
    document.documentElement.style.setProperty('--accent-glow', 'rgba(59, 130, 246, 0.35)');
    document.documentElement.style.setProperty('--bg-main', 'radial-gradient(ellipse at 80% 20%, #050a1a 0%, #000508 60%)');
    return () => {
      document.documentElement.style.setProperty('--accent-primary', '#00f0ff');
      document.documentElement.style.setProperty('--accent-secondary', '#ff003c');
      document.documentElement.style.setProperty('--accent-glow', 'rgba(0, 240, 255, 0.35)');
      document.documentElement.style.setProperty('--bg-main', 'radial-gradient(ellipse at 20% 0%, #001a2e 0%, #000508 45%, #050010 100%)');
    };
  }, []);

  const statsObj = data?.personalstats || data || {};
  const uncategorized = Object.entries(statsObj)
    .filter(([k, v]) => !ALL_CATEGORIZED.has(k) && typeof v !== 'object' && v !== null && k !== 'error')
    .map(([k]) => k);

  return (
    <div className="page-container">
      <div className="page-header d-flex-between">
        <div>
          <h1>Personal Stats :: <span className="accent-text">{userName}</span></h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '0.85rem' }}>Lifetime performance metrics — click a category to expand</p>
        </div>
      </div>
      {error ? <div className="error-message">Error: {error}</div>
        : loading ? <LoadingState message="COMPILING STAT ARCHIVE" />
        : (
          <div className="data-table-container glow-panel">
            <div className="table-header"><h2>Lifetime Performance</h2></div>
            <div style={{ padding: '16px 20px' }}>
              {Object.entries(STAT_CATEGORIES).map(([cat, keys]) => (
                <StatCategory key={cat} title={cat} statKeys={keys} dataObj={statsObj} />
              ))}
              {uncategorized.length > 0 && (
                <StatCategory title="Other" statKeys={uncategorized} dataObj={statsObj} />
              )}
            </div>
          </div>
        )}
    </div>
  );
};

// ==========================================
export const UserTravel = () => {
  const { userName } = useDataContext();
  const { data, loading, error } = useSubPageFetch('travel');

  useEffect(() => {
    document.documentElement.style.setProperty('--accent-primary', '#a855f7');
    document.documentElement.style.setProperty('--accent-secondary', '#d946ef');
    document.documentElement.style.setProperty('--accent-glow', 'rgba(168, 85, 247, 0.35)');
    document.documentElement.style.setProperty('--bg-main', 'radial-gradient(ellipse at 10% 10%, #0f051a 0%, #000508 60%)');
    return () => {
      document.documentElement.style.setProperty('--accent-primary', '#00f0ff');
      document.documentElement.style.setProperty('--accent-secondary', '#ff003c');
      document.documentElement.style.setProperty('--accent-glow', 'rgba(0, 240, 255, 0.35)');
      document.documentElement.style.setProperty('--bg-main', 'radial-gradient(ellipse at 20% 0%, #001a2e 0%, #000508 45%, #050010 100%)');
    };
  }, []);

  const travel = data?.travel || data || {};
  const ts = Number(travel.timestamp) || 0;
  const isFlying = ts > 0 && (Date.now() / 1000) < ts;
  const isAbroad = travel.destination && travel.destination !== 'Torn';

  const getSecsRemaining = () => Math.max(0, Math.floor(ts - Date.now() / 1000));
  const formatDur = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  };

  return (
    <div className="page-container">
      <div className="page-header d-flex-between">
        <div>
          <h1>Flight & Travel :: <span className="accent-text">{userName}</span></h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '0.85rem' }}>Current itinerary &amp; travel data</p>
        </div>
      </div>
      {error ? <div className="error-message">Error: {error}</div>
        : loading ? <LoadingState message="PINGING TRAVEL NETWORK" />
        : (
          <>
            <div className="glow-panel" style={{ padding: '28px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '3rem', lineHeight: 1 }}>{isFlying ? '✈️' : isAbroad ? '🌍' : '🏠'}</div>
                <div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.6rem', letterSpacing: '3px', color: 'rgba(168,85,247,0.6)', textTransform: 'uppercase', marginBottom: '6px' }}>Current Location</div>
                  <div style={{ fontSize: '1.4rem', fontFamily: 'Orbitron, var(--font-heading)', color: '#fff', letterSpacing: '2px' }}>
                    {isFlying ? `En Route → ${travel.destination || 'Unknown'}` : (travel.destination || 'Torn City')}
                  </div>
                  {isFlying && ts > 0 && (
                    <div style={{ marginTop: '10px', fontSize: '0.9rem' }}>
                      <span style={{ color: 'rgba(168,85,247,0.7)' }}>Arriving in: </span>
                      <strong style={{ color: '#a855f7', fontFamily: 'Orbitron, monospace' }}>{formatDur(getSecsRemaining())}</strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '10px' }}>({new Date(ts * 1000).toLocaleString()})</span>
                    </div>
                  )}
                  {isAbroad && !isFlying && (
                    <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'rgba(168,85,247,0.7)' }}>Currently abroad in <strong style={{ color: '#a855f7' }}>{travel.destination}</strong></div>
                  )}
                  {!isFlying && !isAbroad && (
                    <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>No active travel</div>
                  )}
                </div>
              </div>
            </div>

            {Object.keys(travel).length > 0 && (
              <div className="data-table-container glow-panel">
                <div className="table-header"><h2>Travel Data</h2></div>
                <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                  {Object.entries(travel).filter(([, v]) => typeof v !== 'object' && v !== null).map(([k, v]) => (
                    <div key={k} style={{ background: 'rgba(168,85,247,0.04)', border: '1px solid rgba(168,85,247,0.1)', borderRadius: '6px', padding: '12px' }}>
                      <div style={{ fontSize: '0.58rem', letterSpacing: '1.5px', color: 'rgba(168,85,247,0.5)', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', marginBottom: '4px' }}>{k.replace(/_/g, ' ')}</div>
                      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '0.9rem', color: '#fff' }}>
                        {k === 'timestamp' ? new Date(Number(v) * 1000).toLocaleString() : typeof v === 'number' ? v.toLocaleString() : String(v)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
    </div>
  );
};

// ==========================================
export const UserCrimes = () => {
  const { userName } = useDataContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent-primary', '#f97316');
    document.documentElement.style.setProperty('--accent-secondary', '#ef4444');
    document.documentElement.style.setProperty('--accent-glow', 'rgba(249, 115, 22, 0.35)');
    document.documentElement.style.setProperty('--bg-main', 'radial-gradient(ellipse at 50% 100%, #1a0800 0%, #000508 60%)');
    return () => {
      document.documentElement.style.setProperty('--accent-primary', '#00f0ff');
      document.documentElement.style.setProperty('--accent-secondary', '#ff003c');
      document.documentElement.style.setProperty('--accent-glow', 'rgba(0, 240, 255, 0.35)');
      document.documentElement.style.setProperty('--bg-main', 'radial-gradient(ellipse at 20% 0%, #001a2e 0%, #000508 45%, #050010 100%)');
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetchUserCrimes();
        setData(res);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const renderContent = () => {
    if (!data) return null;
    let totalNerve = 0, completedCrimes = 0, totalMoney = 0, totalItems = 0;
    let tAttempts = 0, tSuccess = 0, tFail = 0, tCrit = 0;

    const entries = Object.entries(data).filter(([, v]) => typeof v === 'object' && v !== null);
    entries.forEach(([, crime]) => {
      totalNerve += crime.nerve_spent || 0;
      if (crime.skill === 100) completedCrimes++;
      totalMoney += crime.rewards?.money || 0;
      totalItems += crime.rewards?.items?.length || 0;
      tAttempts += crime.attempts?.total || 0;
      tSuccess += crime.attempts?.success || 0;
      tFail += crime.attempts?.fail || 0;
      tCrit += crime.attempts?.critical_fail || 0;
    });

    return (
      <>
        {/* Summary Cards */}
        <div className="metrics-grid mb-4">
          <div className="metric-card">
            <h3>Mastered Crimes</h3>
            <div className="metric-value" style={{ fontSize: '2rem' }}>{completedCrimes}</div>
            <div className="text-muted mt-1" style={{ fontSize: '0.8rem' }}>at 100 skill</div>
          </div>
          <div className="metric-card">
            <h3>Nerve Spent</h3>
            <div className="metric-value" style={{ fontSize: '2rem' }}>{totalNerve.toLocaleString()}</div>
          </div>
          <div className="metric-card">
            <h3>Gross Returns</h3>
            <div className="metric-value" style={{ fontSize: '1.6rem', color: 'var(--accent-primary)' }}>${totalMoney.toLocaleString()}</div>
            <div className="text-muted mt-1" style={{ fontSize: '0.8rem' }}>{totalItems} items looted</div>
          </div>
          <div className="metric-card">
            <h3>Overall Success</h3>
            <div className="metric-value" style={{ fontSize: '2rem' }}>{tAttempts > 0 ? `${Math.round((tSuccess / tAttempts) * 100)}%` : '—'}</div>
            <div className="text-muted mt-1" style={{ fontSize: '0.8rem' }}>{tAttempts.toLocaleString()} attempts</div>
          </div>
        </div>

        {/* Skill Progress Bars */}
        <div className="data-table-container glow-panel" style={{ marginBottom: '24px' }}>
          <div className="table-header"><h2>Crime Skill Mastery</h2></div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[...entries].sort(([, a], [, b]) => (b.skill || 0) - (a.skill || 0)).map(([name, crime]) => {
              const skill = crime.skill || 0;
              const aTot = crime.attempts?.total || 0;
              const aSucc = crime.attempts?.success || 0;
              const succRate = aTot > 0 ? Math.round((aSucc / aTot) * 100) : 0;
              const skillColor = skill === 100 ? '#00ff88' : skill >= 75 ? '#f59e0b' : skill >= 40 ? '#3b82f6' : '#ef4444';
              return (
                <div key={name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.82rem', letterSpacing: '1px', color: skill === 100 ? '#00ff88' : '#fff' }}>{name}</span>
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', letterSpacing: '1px' }}>{succRate}% success</span>
                      <span style={{ fontFamily: 'Orbitron, monospace', fontSize: '0.78rem', color: skillColor, textShadow: `0 0 6px ${skillColor}80` }}>{skill}/100</span>
                    </div>
                  </div>
                  <div style={{ height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${skill}%`, height: '100%', background: `linear-gradient(90deg, ${skillColor}88, ${skillColor})`, boxShadow: `0 0 8px ${skillColor}80`, borderRadius: '3px', transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Table */}
        <div className="table-responsive glow-panel">
          <div className="table-header"><h2>Detailed Crime Log</h2></div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Crime</th><th>Attempts</th><th>Success</th><th>Failed</th><th>Crit Fail</th><th>Success %</th><th>Nerve</th><th>Skill</th><th>Rewards</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([name, crime]) => {
                const a = crime.attempts || {};
                const aTot = a.total || 0, aSucc = a.success || 0, aFail = a.fail || 0, aCrit = a.critical_fail || 0;
                const pct = aTot > 0 ? Math.round((aSucc / aTot) * 100) : 0;
                const rm = crime.rewards?.money ? `$${crime.rewards.money.toLocaleString()}` : '';
                const ri = crime.rewards?.items?.length > 0 ? `${crime.rewards.items.length} item(s)` : '';
                return (
                  <tr key={name}>
                    <td style={{ fontWeight: '600', fontFamily: 'var(--font-heading)', fontSize: '0.85rem' }}>{name}</td>
                    <td>{aTot.toLocaleString()}</td>
                    <td style={{ color: '#00ff88' }}>{aSucc.toLocaleString()}</td>
                    <td style={{ color: aFail > 0 ? '#ef4444' : 'inherit' }}>{aFail.toLocaleString()}</td>
                    <td style={{ color: aCrit > 0 ? '#dc2626' : 'inherit' }}>{aCrit.toLocaleString()}</td>
                    <td>
                      <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.72rem', background: pct >= 80 ? 'rgba(0,255,136,0.1)' : pct >= 50 ? 'rgba(59,130,246,0.1)' : 'rgba(239,68,68,0.1)', color: pct >= 80 ? '#00ff88' : pct >= 50 ? '#60a5fa' : '#ef4444' }}>
                        {pct}%
                      </span>
                    </td>
                    <td>{crime.nerve_spent?.toLocaleString() || 0}</td>
                    <td style={{ color: crime.skill === 100 ? '#00ff88' : 'inherit' }}>{crime.skill?.toLocaleString() || 0}</td>
                    <td>
                      {rm && <div style={{ color: 'var(--accent-primary)' }}>{rm}</div>}
                      {ri && <div style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>{ri}</div>}
                      {!rm && !ri && <span style={{ color: 'var(--text-muted)' }}>None</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: '700', borderTop: '2px solid rgba(0,240,255,0.15)' }}>
                <td>TOTALS</td>
                <td>{tAttempts.toLocaleString()}</td>
                <td style={{ color: '#00ff88' }}>{tSuccess.toLocaleString()}</td>
                <td style={{ color: '#ef4444' }}>{tFail.toLocaleString()}</td>
                <td style={{ color: '#dc2626' }}>{tCrit.toLocaleString()}</td>
                <td>{tAttempts > 0 ? `${Math.round((tSuccess / tAttempts) * 100)}%` : '—'}</td>
                <td>{totalNerve.toLocaleString()}</td>
                <td>—</td>
                <td style={{ color: 'var(--accent-primary)' }}>${totalMoney.toLocaleString()}</td>
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
          <h1>Crimes &amp; Skill :: <span className="accent-text">{userName}</span></h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '0.85rem' }}>Criminal record &amp; mastery breakdown</p>
        </div>
      </div>
      {error ? <div className="error-message">Error: {error}</div>
        : loading ? <LoadingState message="DECRYPTING CRIMINAL RECORD" />
        : renderContent()}
    </div>
  );
};
