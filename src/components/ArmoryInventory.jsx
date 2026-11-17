import React, { useState, useMemo, useCallback } from 'react';
import { Search, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';

const CATEGORIES = ['All', 'Weapons', 'Armor', 'Drugs', 'Medical'];

const SORT_KEYS = {
  name: (i) => i.name.toLowerCase(),
  category: (i) => i.category.toLowerCase(),
  quantity: (i) => i.quantity,
  available: (i) => i.available,
  loaned: (i) => i.loaned,
};

const SortHeader = ({ label, sortKey, sortConfig, onSort }) => {
  const active = sortConfig.key === sortKey;
  const arrow = active ? (sortConfig.dir === 'asc' ? '▲' : '▼') : '';
  return (
    <th className="sort-header" onClick={() => onSort(sortKey)}>
      {label} {arrow && <span className="sort-arrow">{arrow}</span>}
    </th>
  );
};

const ArmoryInventory = ({ inventory, initialCategory = 'All' }) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [sortConfig, setSortConfig] = useState({ key: 'name', dir: 'asc' });
  const [expandedIdx, setExpandedIdx] = useState(null);

  // Reset category when initialCategory prop changes (from dashboard click)
  React.useEffect(() => {
    if (initialCategory !== 'All') setActiveCategory(initialCategory);
  }, [initialCategory]);

  const onSort = useCallback((key) => {
    setSortConfig((prev) => ({
      key,
      dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const categoryCounts = useMemo(() => {
    const counts = { All: inventory.length };
    CATEGORIES.slice(1).forEach((c) => {
      counts[c] = inventory.filter((i) => i.category === c).length;
    });
    return counts;
  }, [inventory]);

  const filtered = useMemo(() => {
    let items = inventory;

    // Category filter
    if (activeCategory !== 'All') {
      items = items.filter((i) => i.category === activeCategory);
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((i) => i.name.toLowerCase().includes(q));
    }

    // Sort
    const accessor = SORT_KEYS[sortConfig.key] || SORT_KEYS.name;
    const dir = sortConfig.dir === 'asc' ? 1 : -1;
    items = [...items].sort((a, b) => {
      const va = accessor(a);
      const vb = accessor(b);
      if (typeof va === 'string') return va.localeCompare(vb) * dir;
      return (va - vb) * dir;
    });

    return items;
  }, [inventory, activeCategory, search, sortConfig]);

  const toggleExpand = (idx) => setExpandedIdx((prev) => (prev === idx ? null : idx));

  const badgeClass = (cat) => `cat-badge cat-badge--${cat.toLowerCase()}`;

  return (
    <div>
      {/* Toolbar: pills + search */}
      <div className="armory-toolbar">
        <div className="category-pills">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`category-pill${activeCategory === cat ? ' category-pill--active' : ''}`}
              onClick={() => { setActiveCategory(cat); setExpandedIdx(null); }}
            >
              {cat} ({categoryCounts[cat] ?? 0})
            </button>
          ))}
        </div>
        <div className="armory-search-wrap">
          <Search size={16} className="armory-search-icon" />
          <input
            className="armory-search"
            type="text"
            placeholder="Search items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="armory-empty">No items match your filters.</div>
      ) : (
        <div className="data-table-container glow-panel">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 28 }}></th>
                  <SortHeader label="Item" sortKey="name" sortConfig={sortConfig} onSort={onSort} />
                  <SortHeader label="Category" sortKey="category" sortConfig={sortConfig} onSort={onSort} />
                  <SortHeader label="Qty" sortKey="quantity" sortConfig={sortConfig} onSort={onSort} />
                  <SortHeader label="Available" sortKey="available" sortConfig={sortConfig} onSort={onSort} />
                  <SortHeader label="Loaned" sortKey="loaned" sortConfig={sortConfig} onSort={onSort} />
                  <th>Loaned To</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => {
                  const isEquipment = item.category === 'Weapons' || item.category === 'Armor';
                  const isExpanded = expandedIdx === idx;
                  const rowClass = `${item.available === 0 && item.quantity > 0 ? 'row-depleted' : ''} ${item.loaned > 0 ? 'row-loaned' : ''}`;

                  return (
                    <React.Fragment key={`${item.name}-${item.category}-${idx}`}>
                      <tr
                        className={rowClass}
                        onClick={isEquipment ? () => toggleExpand(idx) : undefined}
                      >
                        <td>
                          {isEquipment && (
                            isExpanded
                              ? <ChevronDown size={14} className="text-muted" />
                              : <ChevronRight size={14} className="text-muted" />
                          )}
                        </td>
                        <td>{item.name}</td>
                        <td><span className={badgeClass(item.category)}>{item.category}</span></td>
                        <td>{item.quantity.toLocaleString()}</td>
                        <td>{item.available.toLocaleString()}</td>
                        <td>{item.loaned > 0 ? item.loaned.toLocaleString() : <span className="text-muted">—</span>}</td>
                        <td className="text-muted text-sm">
                          {item.loanedTo.length > 0
                            ? item.loanedTo.map((l) => l.name || `[${l.id}]`).join(', ')
                            : '—'}
                        </td>
                      </tr>
                      {isExpanded && isEquipment && (
                        <tr>
                          <td colSpan={7} className="expanded-panel-content">
                            <div className="expanded-detail-grid">
                              {item.loanedTo.length > 0 ? (
                                item.loanedTo.map((loan, li) => (
                                  <div key={li}>
                                    <div className="expanded-detail-label">Loaned Copy #{li + 1}</div>
                                    <div>{loan.name || `Player [${loan.id}]`}</div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-muted">All copies are in the armory vault.</div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArmoryInventory;
