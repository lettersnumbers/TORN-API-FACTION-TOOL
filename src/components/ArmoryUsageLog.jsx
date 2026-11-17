import React, { useState, useMemo, useCallback } from 'react';
import { Search, ChevronDown, ChevronUp, ChevronRight, Swords, Shield, Pill, Heart, Zap } from 'lucide-react';

const SORT_KEYS = {
  name: (m) => m.name.toLowerCase(),
  weapons: (m) => m.weapons?.length ?? 0,
  armor: (m) => m.armor?.length ?? 0,
  xanax: (m) => m.xanax ?? 0,
  medical: (m) => m.medical ?? 0,
  energy: (m) => m.energy ?? 0,
};

function formatTimestamp(ts) {
  if (!ts) return '—';
  const d = new Date(ts * 1000);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function SortIcon({ column, sortConfig }) {
  if (sortConfig.key !== column) {
    return <ChevronDown className="sort-icon sort-icon-inactive" size={14} />;
  }
  return sortConfig.dir === 'asc'
    ? <ChevronUp className="sort-icon sort-icon-active" size={14} />
    : <ChevronDown className="sort-icon sort-icon-active" size={14} />;
}

function ValueCell({ value, className }) {
  if (!value || value === 0) {
    return <td className="text-muted">—</td>;
  }
  return <td className={className}>{value.toLocaleString()}</td>;
}

function UsageBar({ xanax, medical, energy, maxTotal }) {
  const total = (xanax ?? 0) + (medical ?? 0) + (energy ?? 0);
  if (total === 0 || maxTotal === 0) return <div className="usage-bar" />;

  const widthPct = (total / maxTotal) * 100;
  const xPct = ((xanax ?? 0) / total) * 100;
  const mPct = ((medical ?? 0) / total) * 100;
  const ePct = ((energy ?? 0) / total) * 100;

  return (
    <div className="usage-bar" style={{ width: `${widthPct}%` }}>
      {xPct > 0 && <div className="usage-bar-xan" style={{ width: `${xPct}%` }} />}
      {mPct > 0 && <div className="usage-bar-med" style={{ width: `${mPct}%` }} />}
      {ePct > 0 && <div className="usage-bar-nrg" style={{ width: `${ePct}%` }} />}
    </div>
  );
}

function ExpandedDetail({ member }) {
  const loanedWeapons = member.weapons ?? [];
  const loanedArmor = member.armor ?? [];
  const events = useMemo(
    () => [...(member.events ?? [])].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)),
    [member.events]
  );

  return (
    <tr className="expanded-row">
      <td colSpan={7}>
        <div className="expanded-panel-content">
          <div className="expanded-section">
            <h4 className="expanded-section-title">
              <Swords size={14} /> Loaned Weapons ({loanedWeapons.length})
            </h4>
            {loanedWeapons.length > 0 ? (
              <ul className="expanded-list">
                {loanedWeapons.map((w, i) => (
                  <li key={i} className="expanded-list-item">{w}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">None</p>
            )}
          </div>

          <div className="expanded-section">
            <h4 className="expanded-section-title">
              <Shield size={14} /> Loaned Armor ({loanedArmor.length})
            </h4>
            {loanedArmor.length > 0 ? (
              <ul className="expanded-list">
                {loanedArmor.map((a, i) => (
                  <li key={i} className="expanded-list-item">{a}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">None</p>
            )}
          </div>

          <div className="expanded-section">
            <h4 className="expanded-section-title">Recent Usage Events</h4>
            {events.length > 0 ? (
              <table className="data-table expanded-events-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Item</th>
                    <th>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev, i) => (
                    <tr key={i}>
                      <td className="text-muted">{formatTimestamp(ev.timestamp)}</td>
                      <td>{ev.item}</td>
                      <td className="accent-text">{ev.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-muted">No recent events</p>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function ArmoryUsageLog({ memberUsage, activeMembers }) {
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'xanax', dir: 'desc' });
  const [expandedId, setExpandedId] = useState(null);

  const sourceList = showAll ? (memberUsage ?? []) : (activeMembers ?? []);

  const handleSort = useCallback((key) => {
    setSortConfig((prev) => ({
      key,
      dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc',
    }));
  }, []);

  const filteredSorted = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = sourceList;
    if (q) {
      list = list.filter((m) => m.name?.toLowerCase().includes(q));
    }
    const accessor = SORT_KEYS[sortConfig.key] ?? SORT_KEYS.name;
    const dir = sortConfig.dir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      const va = accessor(a);
      const vb = accessor(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [sourceList, search, sortConfig]);

  const maxTotal = useMemo(() => {
    let max = 0;
    for (const m of sourceList) {
      const t = (m.xanax ?? 0) + (m.medical ?? 0) + (m.energy ?? 0);
      if (t > max) max = t;
    }
    return max;
  }, [sourceList]);

  const totals = useMemo(() => {
    const t = { weapons: 0, armor: 0, xanax: 0, medical: 0, energy: 0 };
    for (const m of filteredSorted) {
      t.weapons += m.weapons?.length ?? 0;
      t.armor += m.armor?.length ?? 0;
      t.xanax += m.xanax ?? 0;
      t.medical += m.medical ?? 0;
      t.energy += m.energy ?? 0;
    }
    return t;
  }, [filteredSorted]);

  const toggleExpand = useCallback((id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const columns = [
    { key: 'name', label: 'Member' },
    { key: 'weapons', label: 'Loaned Weapons' },
    { key: 'armor', label: 'Loaned Armor' },
    { key: 'xanax', label: 'Xanax (30d)' },
    { key: 'medical', label: 'Medical (30d)' },
    { key: 'energy', label: 'Energy (30d)' },
  ];

  return (
    <div className="glow-panel">
      <div className="usage-log-controls">
        <h3 className="table-header">Member Usage Log</h3>
        <button
          className="action-button"
          onClick={() => {
            setShowAll((p) => !p);
            setExpandedId(null);
          }}
        >
          {showAll ? 'Active only' : 'Show all members'}
        </button>
      </div>

      <div className="armory-search">
        <Search size={16} />
        <input
          type="text"
          placeholder="Search members…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th className="expand-col" />
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="sortable-header"
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}
                  <SortIcon column={col.key} sortConfig={sortConfig} />
                </th>
              ))}
              <th>Usage</th>
            </tr>
          </thead>

          <tbody>
            {filteredSorted.length === 0 && (
              <tr>
                <td colSpan={8} className="text-muted">
                  No members found
                </td>
              </tr>
            )}

            {filteredSorted.map((member) => (
              <React.Fragment key={member.id}>
                <tr
                  className={`usage-row ${expandedId === member.id ? 'usage-row-expanded' : ''}`}
                  onClick={() => toggleExpand(member.id)}
                >
                  <td className="expand-col">
                    {expandedId === member.id
                      ? <ChevronDown size={14} className="accent-text" />
                      : <ChevronRight size={14} className="text-muted" />}
                  </td>
                  <td className="member-name">{member.name}</td>
                  <ValueCell value={member.weapons?.length ?? 0} />
                  <ValueCell value={member.armor?.length ?? 0} />
                  <ValueCell value={member.xanax ?? 0} className="val-xanax" />
                  <ValueCell value={member.medical ?? 0} className="val-medical" />
                  <ValueCell value={member.energy ?? 0} className="val-energy" />
                  <td className="usage-bar-cell">
                    <UsageBar
                      xanax={member.xanax}
                      medical={member.medical}
                      energy={member.energy}
                      maxTotal={maxTotal}
                    />
                  </td>
                </tr>
                {expandedId === member.id && <ExpandedDetail member={member} />}
              </React.Fragment>
            ))}
          </tbody>

          <tfoot>
            <tr className="usage-totals-row">
              <td />
              <td className="accent-text">Totals ({filteredSorted.length})</td>
              <td>{totals.weapons.toLocaleString()}</td>
              <td>{totals.armor.toLocaleString()}</td>
              <td className="val-xanax">{totals.xanax.toLocaleString()}</td>
              <td className="val-medical">{totals.medical.toLocaleString()}</td>
              <td className="val-energy">{totals.energy.toLocaleString()}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
