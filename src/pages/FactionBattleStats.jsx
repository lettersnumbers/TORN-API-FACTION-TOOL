import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import {
  fetchFactionData, getFactionMemberStats, getMemberHistory,
  getApiKey, getFactionId, fetchUserSpecific, saveUserStats, fetchUserData,
} from '../services/api';
import { useDataContext } from '../context/DataContext';
import './FactionPage.css';

// ─── Constants ────────────────────────────────────────────────────────────────
const STAT_CFG = [
  { key: 'strength',  label: 'STR', color: '#ef4444', glow: 'rgba(239,68,68,0.5)'   },
  { key: 'defense',   label: 'DEF', color: '#3b82f6', glow: 'rgba(59,130,246,0.5)'  },
  { key: 'speed',     label: 'SPD', color: '#22c55e', glow: 'rgba(34,197,94,0.5)'   },
  { key: 'dexterity', label: 'DEX', color: '#a855f7', glow: 'rgba(168,85,247,0.5)'  },
  { key: 'total',     label: 'TOTAL', color: '#00f0ff', glow: 'rgba(0,240,255,0.5)' },
];

const fmt   = (n) => n ? Number(n).toLocaleString() : '—';
const fmtM  = (n) => { if (!n) return '0'; if (n >= 1e6) return `${(n/1e6).toFixed(2)}M`; if (n >= 1000) return `${(n/1000).toFixed(0)}K`; return String(n); };
const fmtTs = (ts) => ts ? new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—';
const staleness = (ts) => {
  if (!ts) return { label: 'Never', cls: 'old' };
  const days = Math.floor((Date.now() / 1000 - ts) / 86400);
  if (days < 0) return { label: 'Just now', cls: 'fresh' };
  if (days === 0) return { label: 'Today', cls: 'fresh' };
  if (days < 3)  return { label: `${days}d ago`, cls: 'fresh' };
  if (days < 14) return { label: `${days}d ago`, cls: 'stale' };
  return { label: `${days}d ago`, cls: 'old' };
};

// ─── Avatar ──────────────────────────────────────────────────────────────────
const Avatar = ({ playerId, name, size = 32 }) => {
  const [err, setErr] = useState(false);
  const color = (() => { let h = 0; for (let i = 0; i < (name||'').length; i++) h = name.charCodeAt(i) + ((h<<5)-h); return `hsl(${Math.abs(h)%360},60%,45%)`; })();
  const init  = (name||'?').slice(0,2).toUpperCase();
  if (err || !playerId) return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:color, border:'1px solid rgba(0,240,255,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.35, fontFamily:'var(--font-heading)', fontWeight:700, color:'#fff', flexShrink:0 }}>{init}</div>
  );
  return <img src={`https://avatars.torn.com/avatars/${playerId}_small.jpg`} alt={name} onError={()=>setErr(true)} style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover', border:'1px solid rgba(0,240,255,0.25)', flexShrink:0 }} loading="lazy" />;
};

// ─── Custom tooltip ───────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'rgba(0,6,14,0.97)', border:'1px solid rgba(0,240,255,0.2)', borderRadius:8, padding:'12px 16px', fontFamily:'var(--font-heading)', fontSize:'0.75rem', letterSpacing:'1px' }}>
      <div style={{ color:'rgba(0,240,255,0.6)', marginBottom:8, fontSize:'0.65rem', letterSpacing:'2px' }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display:'flex', justifyContent:'space-between', gap:24, color:p.color, marginBottom:2 }}>
          <span>{p.name?.toUpperCase()}</span>
          <span style={{ fontFamily:'Orbitron,monospace', fontWeight:700 }}>{fmtM(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const FactionBattleStats = () => {
  const { factionName, currentPlayerId, setCurrentPlayerId } = useDataContext();

  const [roster,       setRoster]       = useState([]);
  const [memberStats,  setMemberStats]  = useState([]);
  const [histories,    setHistories]    = useState({});   // { player_id: [...snapshots] }
  const [selectedId,   setSelectedId]   = useState(null);
  const [chartTab,     setChartTab]     = useState('line'); // 'line' | 'bar'
  const [visibleStats, setVisibleStats] = useState({ strength:true, defense:true, speed:true, dexterity:true, total:false });
  const [shareStatus,  setShareStatus]  = useState('idle');
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [loadingStats,  setLoadingStats]  = useState(true);
  const [error, setError] = useState(null);

  // ── Fetch faction roster ──────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoadingRoster(true);
      try {
        const d = await fetchFactionData(getFactionId());
        // fetchFactionData returns { members: obj|array, name, ... }
        // Torn v2 members is an object keyed by player_id string: { "123": { name, level, ... } }
        const raw = d?.members || {};
        const list = Array.isArray(raw)
          ? raw.map(m => ({ ...m, player_id: parseInt(m.id || m.player_id) }))
          : Object.entries(raw).map(([id, m]) => ({
              player_id: parseInt(id),
              name: m.name,
              level: m.level,
              position: m.position,
              days_in_faction: m.days_in_faction,
              last_action: m.last_action,
              status: m.status,
            }));
        setRoster(list);
      } catch (e) {
        setError(e?.message || String(e));
      } finally {
        setLoadingRoster(false);
      }
    })();
  }, []);

  // ── Fetch Redis stats ─────────────────────────────────────────────────────
  const refreshStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const r = await getFactionMemberStats();
      setMemberStats(r.members || []);
    } catch { /* silent */ }
    finally { setLoadingStats(false); }
  }, []);
  useEffect(() => { refreshStats(); }, [refreshStats]);

  // ── Fetch histories for all members who have stats ────────────────────────
  useEffect(() => {
    if (!memberStats.length) return;
    (async () => {
      const result = {};
      await Promise.all(memberStats.map(async (m) => {
        result[m.player_id] = await getMemberHistory(m.player_id);
      }));
      setHistories(result);
    })();
  }, [memberStats]);

  // ── Merge roster + stats ─────────────────────────────────────────────────
  const merged = useMemo(() => {
    const statsMap = Object.fromEntries(memberStats.map(s => [String(s.player_id), s]));
    return roster
      .map(m => ({ ...m, savedStats: statsMap[String(m.player_id)] || null }))
      .sort((a, b) => (b.savedStats?.stats?.total || 0) - (a.savedStats?.stats?.total || 0));
  }, [roster, memberStats]);

  // ── Selected member data ─────────────────────────────────────────────────
  const selMember  = merged.find(m => m.player_id === selectedId) || null;
  const selHistory = selectedId ? (histories[selectedId] || []) : [];

  // ── Line chart data ──────────────────────────────────────────────────────
  const lineData = useMemo(() =>
    selHistory.map(s => ({
      date:      fmtTs(s.timestamp),
      strength:  s.strength  || 0,
      defense:   s.defense   || 0,
      speed:     s.speed     || 0,
      dexterity: s.dexterity || 0,
      total:     s.total     || 0,
    })),
  [selHistory]);

  // ── Bar chart data (all members comparative) ─────────────────────────────
  const barData = useMemo(() =>
    memberStats
      .filter(m => m.stats?.total)
      .sort((a, b) => (b.stats.total || 0) - (a.stats.total || 0))
      .map(m => {
        const hist    = histories[m.player_id] || [];
        const oldest  = hist[0];
        const newest  = hist[hist.length - 1];
        const pctGain = (oldest && newest && oldest.total && newest.total > oldest.total)
          ? `+${Math.round(((newest.total - oldest.total) / oldest.total) * 100)}%`
          : hist.length > 1 ? '—' : 'First';
        return {
          name:      m.name,
          player_id: m.player_id,
          strength:  m.stats.strength  || 0,
          defense:   m.stats.defense   || 0,
          speed:     m.stats.speed     || 0,
          dexterity: m.stats.dexterity || 0,
          total:     m.stats.total     || 0,
          pctGain,
          saves: hist.length,
        };
      }),
  [memberStats, histories]);

  // ── Share stats handler ──────────────────────────────────────────────────
  const handleShareStats = async () => {
    if (shareStatus === 'sharing') return;
    setShareStatus('sharing');
    try {
      const [statsData, profileData] = await Promise.all([
        fetchUserSpecific('battlestats'),
        fetchUserData(),
      ]);
      const id   = profileData.player_id;
      const name = profileData.name;
      const lvl  = profileData.level;
      if (id) setCurrentPlayerId(id);
      await saveUserStats({
        player_id: id,
        name,
        level: lvl,
        stats: {
          strength:  statsData.strength  || 0,
          speed:     statsData.speed     || 0,
          defense:   statsData.defense   || 0,
          dexterity: statsData.dexterity || 0,
          total: statsData.total || ((statsData.strength||0)+(statsData.speed||0)+(statsData.defense||0)+(statsData.dexterity||0)),
        },
      });
      setShareStatus('success');
      await refreshStats();
      setTimeout(() => setShareStatus('idle'), 3000);
    } catch (e) {
      console.error('[Share Stats]', e);
      setShareStatus('error');
      setTimeout(() => setShareStatus('idle'), 3000);
    }
  };

  const toggleStat = (key) =>
    setVisibleStats(v => ({ ...v, [key]: !v[key] }));

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header d-flex-between" style={{ marginBottom: 24 }}>
        <div>
          <h1>Battle Stats :: <span className="accent-text">{factionName}</span></h1>
          <p style={{ color:'var(--text-muted)', marginTop:4, fontSize:'0.85rem' }}>
            Gym stats — shared by members when they log in
          </p>
        </div>
        {/* Global share button */}
        {getApiKey() && (
          <button
            onClick={handleShareStats}
            disabled={shareStatus === 'sharing'}
            className="share-stats-btn"
            style={{ flexShrink: 0 }}
          >
            {shareStatus === 'sharing' ? '⟳ SYNCING...'
             : shareStatus === 'success' ? '✓ SHARED'
             : shareStatus === 'error'   ? '✗ FAILED'
             : '↗ SHARE MY STATS'}
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* ── Member Table ─────────────────────────────────────────────────── */}
      <div className="member-intel-panel" style={{ marginTop: 0, marginBottom: 24 }}>
        <div className="intel-panel-header" style={{ cursor: 'default', pointerEvents: 'none' }}>
          <div className="intel-panel-title">
            <div className="intel-icon" />
            Agent Intel
            <span className="intel-count-badge">{merged.length} agents</span>
            {memberStats.length > 0 && (
              <span className="intel-count-badge" style={{ borderColor:'rgba(0,255,136,0.3)', color:'#00ff88', background:'rgba(0,255,136,0.07)' }}>
                {memberStats.length} shared
              </span>
            )}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="faction-table" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th style={{ width: 200 }}>AGENT</th>
                {STAT_CFG.slice(0,4).map(s => (
                  <th key={s.key} style={{ color: s.color, textAlign:'right' }}>{s.label}</th>
                ))}
                <th style={{ color:'var(--accent-primary)', textAlign:'right' }}>TOTAL</th>
                <th style={{ textAlign:'center' }}>UPDATED</th>
                <th style={{ textAlign:'center' }}>CHART</th>
              </tr>
            </thead>
            <tbody>
              {(loadingRoster || loadingStats) ? (
                <tr><td colSpan={8} style={{ textAlign:'center', padding:32, color:'var(--text-muted)', fontFamily:'var(--font-heading)', letterSpacing:'2px', fontSize:'0.7rem' }}>
                  LOADING AGENT PROFILES...
                </td></tr>
              ) : merged.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign:'center', padding:32, color:'var(--text-muted)' }}>No faction members found</td></tr>
              ) : merged.map(m => {
                const ss    = m.savedStats?.stats;
                const ts    = m.savedStats?.lastUpdated;
                const stale = staleness(ts);
                const isMe  = currentPlayerId && m.player_id === currentPlayerId;
                const isSelected = m.player_id === selectedId;
                return (
                  <tr
                    key={m.player_id}
                    style={{
                      background: isSelected ? 'rgba(0,240,255,0.05)' : undefined,
                      outline: isSelected ? '1px solid rgba(0,240,255,0.15)' : undefined,
                    }}
                  >
                    {/* Avatar + Name */}
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <Avatar playerId={m.player_id} name={m.name} size={32} />
                        <div>
                          <div style={{ fontFamily:'var(--font-heading)', fontSize:'0.85rem', letterSpacing:'1px', color:'#e2e8f0' }}>
                            {m.name}
                            {isMe && <span style={{ marginLeft:6, fontSize:'0.55rem', padding:'1px 5px', background:'rgba(0,240,255,0.1)', border:'1px solid rgba(0,240,255,0.25)', borderRadius:8, color:'var(--accent-primary)', letterSpacing:'1px' }}>YOU</span>}
                          </div>
                          <div style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}>Lv.{m.level} · {m.position}</div>
                        </div>
                      </div>
                    </td>

                    {/* Stats or empty */}
                    {STAT_CFG.slice(0,4).map(s => (
                      <td key={s.key} style={{ textAlign:'right', fontFamily:'Orbitron,monospace', fontSize:'0.8rem', color: ss ? s.color : 'var(--text-muted)' }}>
                        {ss ? fmtM(ss[s.key]) : '—'}
                      </td>
                    ))}
                    <td style={{ textAlign:'right', fontFamily:'Orbitron,monospace', fontSize:'0.9rem', fontWeight:700, color: ss ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                      {ss ? fmtM(ss.total) : (
                        isMe
                          ? <button onClick={handleShareStats} disabled={shareStatus==='sharing'} style={{ fontSize:'0.6rem', padding:'3px 10px', background:'rgba(0,240,255,0.07)', border:'1px solid rgba(0,240,255,0.2)', borderRadius:8, color:'var(--accent-primary)', fontFamily:'var(--font-heading)', letterSpacing:'1px', cursor:'pointer' }}>
                              ↗ SHARE
                            </button>
                          : <span style={{ fontSize:'0.7rem', color:'rgba(148,163,184,0.35)', fontFamily:'var(--font-heading)', letterSpacing:'1px' }}>NOT SHARED</span>
                      )}
                    </td>

                    {/* Updated */}
                    <td style={{ textAlign:'center' }}>
                      {ss
                        ? <span className={`intel-stale-badge ${stale.cls}`}>{stale.label}</span>
                        : <span style={{ fontSize:'0.65rem', color:'rgba(148,163,184,0.3)', letterSpacing:'1px', fontFamily:'var(--font-heading)' }}>—</span>
                      }
                    </td>

                    {/* Chart toggle */}
                    <td style={{ textAlign:'center' }}>
                      {ss
                        ? <button
                            onClick={() => setSelectedId(id => id === m.player_id ? null : m.player_id)}
                            style={{ fontSize:'0.6rem', padding:'3px 10px', background: isSelected ? 'rgba(0,240,255,0.15)' : 'rgba(0,240,255,0.04)', border:`1px solid rgba(0,240,255,${isSelected?'0.35':'0.1'})`, borderRadius:8, color: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)', fontFamily:'var(--font-heading)', letterSpacing:'1px', cursor:'pointer', transition:'all 0.2s' }}
                          >
                            {isSelected ? '▲ HIDE' : '▼ VIEW'}
                          </button>
                        : null
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Charts Section ────────────────────────────────────────────────── */}
      <div className="member-intel-panel" style={{ marginTop: 0 }}>
        <div className="intel-panel-header" style={{ cursor:'default', pointerEvents:'none' }}>
          <div className="intel-panel-title">
            <div className="intel-icon" />
            Stat Analytics
          </div>
          {/* Tab switcher */}
          <div style={{ display:'flex', gap:8 }}>
            {[['line','📈 Growth'], ['bar','📊 Compare']].map(([tab, lbl]) => (
              <button
                key={tab}
                onClick={(e) => { e.stopPropagation(); setChartTab(tab); }}
                style={{
                  fontSize:'0.65rem', padding:'4px 14px',
                  background: chartTab===tab ? 'rgba(0,240,255,0.12)' : 'rgba(0,240,255,0.03)',
                  border:`1px solid rgba(0,240,255,${chartTab===tab?'0.35':'0.1'})`,
                  borderRadius:8, color: chartTab===tab ? 'var(--accent-primary)' : 'var(--text-muted)',
                  fontFamily:'var(--font-heading)', letterSpacing:'1px', cursor:'pointer', transition:'all 0.2s',
                  pointerEvents: 'all',
                }}
              >{lbl}</button>
            ))}
          </div>
        </div>

        <div className="intel-panel-body">

          {/* ── Line chart: single-member growth ─────────────────────────── */}
          {chartTab === 'line' && (
            <div>
              {!selMember ? (
                <div style={{ textAlign:'center', padding:'48px 24px', color:'var(--text-muted)', fontFamily:'var(--font-heading)', letterSpacing:'2px', fontSize:'0.75rem' }}>
                  ▼ SELECT A MEMBER FROM THE TABLE ABOVE TO VIEW THEIR STAT GROWTH
                </div>
              ) : (
                <>
                  {/* Member header */}
                  <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
                    <Avatar playerId={selMember.player_id} name={selMember.name} size={40} />
                    <div>
                      <div style={{ fontFamily:'var(--font-heading)', fontSize:'1rem', letterSpacing:'2px', color:'#e2e8f0' }}>{selMember.name}</div>
                      <div style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>Lv.{selMember.level} · {selHistory.length} snapshot{selHistory.length!==1?'s':''}</div>
                    </div>
                  </div>

                  {/* Stat toggles */}
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
                    {STAT_CFG.map(s => (
                      <button
                        key={s.key}
                        onClick={() => toggleStat(s.key)}
                        style={{
                          fontSize:'0.6rem', padding:'4px 12px', borderRadius:16, cursor:'pointer',
                          fontFamily:'var(--font-heading)', letterSpacing:'1.5px', transition:'all 0.2s',
                          background: visibleStats[s.key] ? `${s.color}20` : 'rgba(255,255,255,0.03)',
                          border:`1px solid ${visibleStats[s.key] ? s.color : 'rgba(255,255,255,0.08)'}`,
                          color: visibleStats[s.key] ? s.color : 'var(--text-muted)',
                        }}
                      >● {s.label}</button>
                    ))}
                  </div>

                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={lineData.length ? lineData : [{ date: fmtTs(selMember.savedStats?.lastUpdated), ...selMember.savedStats?.stats }]} margin={{ top:5, right:20, left:10, bottom:5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="date" tick={{ fill:'rgba(148,163,184,0.6)', fontSize:11, fontFamily:'var(--font-heading)' }} axisLine={{ stroke:'rgba(255,255,255,0.08)' }} tickLine={false} />
                      <YAxis
                        tickFormatter={fmtM}
                        tick={{ fill:'rgba(148,163,184,0.6)', fontSize:11, fontFamily:'var(--font-heading)' }}
                        axisLine={false} tickLine={false} width={62}
                        domain={[
                          (dataMin) => Math.max(0, Math.floor(dataMin * 0.85)),
                          (dataMax) => Math.ceil(dataMax * 1.08),
                        ]}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontFamily:'var(--font-heading)', fontSize:'0.65rem', letterSpacing:'1px', paddingTop:12 }} />
                      {STAT_CFG.map(s => visibleStats[s.key] && (
                        <Line
                          key={s.key}
                          type="monotone"
                          dataKey={s.key}
                          name={s.label}
                          stroke={s.color}
                          strokeWidth={s.key==='total' ? 2.5 : 1.5}
                          dot={{ fill:s.color, r:5, strokeWidth:0 }}
                          activeDot={{ r:7, fill:s.color, stroke:'rgba(0,0,0,0.5)', strokeWidth:2 }}
                          isAnimationActive={true}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                  {selHistory.length < 2 && (
                    <div style={{ textAlign:'center', marginTop:8, fontSize:'0.65rem', color:'rgba(148,163,184,0.35)', fontFamily:'var(--font-heading)', letterSpacing:'1px' }}>
                      📍 1 SNAPSHOT — CHART WILL GROW AS STATS ARE RE-SHARED OVER TIME
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Bar chart: comparative ────────────────────────────────────── */}
          {chartTab === 'bar' && (
            <div>
              {barData.length === 0 ? (
                <div style={{ textAlign:'center', padding:'48px 24px', color:'var(--text-muted)', fontFamily:'var(--font-heading)', letterSpacing:'2px', fontSize:'0.75rem' }}>
                  NO STATS SHARED YET — MEMBERS MUST SHARE THEIR STATS TO APPEAR HERE
                </div>
              ) : (
                <>
                  {/* Growth badges */}
                  <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:20 }}>
                    {barData.map(m => (
                      <div key={m.player_id} style={{ padding:'6px 14px', background:'rgba(0,6,14,0.8)', border:'1px solid rgba(0,240,255,0.1)', borderRadius:8, display:'flex', alignItems:'center', gap:8 }}>
                        <Avatar playerId={m.player_id} name={m.name} size={20} />
                        <span style={{ fontFamily:'var(--font-heading)', fontSize:'0.7rem', color:'#e2e8f0', letterSpacing:'1px' }}>{m.name}</span>
                        <span style={{ fontFamily:'Orbitron,monospace', fontSize:'0.65rem', color: m.pctGain?.startsWith('+') ? '#00ff88' : 'var(--text-muted)', fontWeight:700 }}>{m.pctGain}</span>
                        <span style={{ fontSize:'0.55rem', color:'rgba(148,163,184,0.4)', letterSpacing:'1px' }}>{m.saves} save{m.saves!==1?'s':''}</span>
                      </div>
                    ))}
                  </div>

                  <ResponsiveContainer width="100%" height={340}>
                    <BarChart data={barData} margin={{ top:5, right:20, left:10, bottom:20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fill:'rgba(148,163,184,0.7)', fontSize:11, fontFamily:'var(--font-heading)' }}
                        axisLine={{ stroke:'rgba(255,255,255,0.08)' }}
                        tickLine={false}
                        angle={-30}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis
                        tickFormatter={fmtM}
                        tick={{ fill:'rgba(148,163,184,0.6)', fontSize:11, fontFamily:'var(--font-heading)' }}
                        axisLine={false} tickLine={false} width={62}
                        domain={[0, (dataMax) => Math.ceil(dataMax * 1.12)]}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontFamily:'var(--font-heading)', fontSize:'0.65rem', letterSpacing:'1px', paddingTop:8 }} />
                      {STAT_CFG.slice(0,4).map(s => (
                        <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[3,3,0,0]} maxBarSize={40} opacity={0.85} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default FactionBattleStats;
