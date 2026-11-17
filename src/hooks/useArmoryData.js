import { useState, useEffect, useMemo } from 'react';
import { fetchFactionArmoryData, fetchFactionArmoryNews, fetchFactionData } from '../services/api';

/**
 * Merges raw API responses into a unified armory data model.
 * Returns: { loading, error, refresh, financials, inventory, members, alerts, topConsumers, loanSummary }
 */
const useArmoryData = () => {
  const [raw, setRaw] = useState(null);
  const [newsRaw, setNewsRaw] = useState(null);
  const [membersRaw, setMembersRaw] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey(k => k + 1);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [armory, news, faction] = await Promise.all([
          fetchFactionArmoryData(),
          fetchFactionArmoryNews().catch(() => ({})),
          fetchFactionData().catch(() => ({ members: {} })),
        ]);
        if (active) {
          setRaw(armory);
          setNewsRaw(news);
          setMembersRaw(faction.members || {});
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [refreshKey]);

  // ── Financials ──────────────────────────────────────────────────────
  const financials = useMemo(() => {
    if (!raw?.currency) return { bank: 0, points: 0 };
    return { bank: raw.currency.faction || 0, points: raw.currency.points || 0 };
  }, [raw]);

  // ── Inventory: flatten all categories into one array ────────────────
  const inventory = useMemo(() => {
    if (!raw) return [];
    const items = [];

    const push = (obj, category) => {
      if (!obj) return;
      const arr = Array.isArray(obj) ? obj : Object.values(obj);
      arr.forEach(item => {
        const qty = item.quantity ?? 1;
        // loaned_to can be a comma string, an object, or null
        let loanedCount = 0;
        let loanedNames = [];
        if (item.loaned_to) {
          if (typeof item.loaned_to === 'object' && !Array.isArray(item.loaned_to)) {
            loanedNames = Object.entries(item.loaned_to).map(([id, name]) => ({ id, name }));
            loanedCount = loanedNames.length;
          } else {
            const ids = String(item.loaned_to).split(',').map(s => s.trim()).filter(Boolean);
            loanedNames = ids.map(id => ({ id, name: null }));
            loanedCount = ids.length;
          }
        }
        items.push({
          name: item.name || 'Unknown',
          category,
          quantity: qty,
          available: Math.max(0, qty - loanedCount),
          loaned: loanedCount,
          loanedTo: loanedNames,
          type: item.type || null,
        });
      });
    };

    push(raw.weapons, 'Weapons');
    push(raw.armor, 'Armor');
    push(raw.drugs, 'Drugs');
    push(raw.medical, 'Medical');
    return items;
  }, [raw]);

  // ── Usage: parse armory news into per-member consumption ────────────
  const memberUsage = useMemo(() => {
    const map = {};
    const memArray = Array.isArray(membersRaw) ? membersRaw : Object.values(membersRaw || {});

    memArray.forEach(m => {
      const id = String(m.id || m.player_id);
      map[id] = { id, name: m.name || `Unknown [${id}]`, weapons: [], armor: [], xanax: 0, medical: 0, energy: 0, events: [] };
    });

    const initUser = (id, nameStr = null) => {
      id = String(id);
      if (!map[id]) {
        map[id] = { id, name: nameStr || `Unknown [${id}]`, weapons: [], armor: [], xanax: 0, medical: 0, energy: 0, events: [] };
      }
    };

    // Loan tracking from armory data
    const processLoan = (loanedTo, itemName, type) => {
      if (!loanedTo) return;
      if (typeof loanedTo === 'object' && !Array.isArray(loanedTo)) {
        Object.entries(loanedTo).forEach(([id, name]) => {
          initUser(id, name);
          map[id][type].push(itemName);
        });
      } else {
        String(loanedTo).split(',').map(s => s.trim()).filter(Boolean).forEach(id => {
          initUser(id);
          map[id][type].push(itemName);
        });
      }
    };

    if (raw?.weapons) {
      const arr = Array.isArray(raw.weapons) ? raw.weapons : Object.values(raw.weapons);
      arr.forEach(w => processLoan(w.loaned_to, w.name, 'weapons'));
    }
    if (raw?.armor) {
      const arr = Array.isArray(raw.armor) ? raw.armor : Object.values(raw.armor);
      arr.forEach(a => processLoan(a.loaned_to, a.name, 'armor'));
    }

    // Parse news logs
    const newsArray = Object.values(newsRaw || {});
    newsArray.forEach(log => {
      if (!log.news) return;
      let id, name, qty, item, timestamp;

      const htmlMatch = log.news.match(/XID=(\d+)["'][^>]*>([^<]+)<\/a> used (\d+)x (.*?) from the armory/i);
      if (htmlMatch) {
        id = String(htmlMatch[1]);
        name = htmlMatch[2];
        qty = parseInt(htmlMatch[3]);
        item = htmlMatch[4].toLowerCase();
      } else {
        const plainMatch = log.news.match(/(.+?) \[(\d+)\] used (\d+)x (.*?) from the armory/i);
        if (plainMatch) {
          name = plainMatch[1];
          id = String(plainMatch[2]);
          qty = parseInt(plainMatch[3]);
          item = plainMatch[4].toLowerCase();
        }
      }

      timestamp = log.timestamp || null;

      if (id && item) {
        initUser(id, name);
        if (item.includes('xanax')) map[id].xanax += qty;
        else if (item.includes('first aid') || item.includes('morphine') || item.includes('blood')) map[id].medical += qty;
        else if (item.includes('can') || item.includes('energy') || item.includes('fcs')) map[id].energy += qty;
        map[id].events.push({ timestamp, item, qty });
      }
    });

    return Object.values(map).sort((a, b) => b.xanax - a.xanax || b.medical - a.medical || a.name.localeCompare(b.name));
  }, [raw, newsRaw, membersRaw]);

  // ── Active members: filter out zeros ────────────────────────────────
  const activeMembers = useMemo(() =>
    memberUsage.filter(m => m.xanax + m.medical + m.energy > 0 || m.weapons.length + m.armor.length > 0),
    [memberUsage]
  );

  // ── Top consumers ──────────────────────────────────────────────────
  const topConsumers = useMemo(() => {
    const byXanax = [...memberUsage].sort((a, b) => b.xanax - a.xanax).slice(0, 5).filter(m => m.xanax > 0);
    const byMedical = [...memberUsage].sort((a, b) => b.medical - a.medical).slice(0, 5).filter(m => m.medical > 0);
    const byEnergy = [...memberUsage].sort((a, b) => b.energy - a.energy).slice(0, 5).filter(m => m.energy > 0);
    return { xanax: byXanax, medical: byMedical, energy: byEnergy };
  }, [memberUsage]);

  // ── Loan summary ───────────────────────────────────────────────────
  const loanSummary = useMemo(() => {
    const totals = { weapons: 0, armor: 0, drugs: 0, medical: 0, totalItems: 0, totalLoaned: 0 };
    inventory.forEach(item => {
      const cat = item.category.toLowerCase();
      totals.totalItems += item.quantity;
      totals.totalLoaned += item.loaned;
      if (totals[cat] !== undefined) totals[cat] += item.loaned;
    });
    return totals;
  }, [inventory]);

  // ── Stock alerts ───────────────────────────────────────────────────
  const alerts = useMemo(() => {
    const warnings = [];
    // Calculate burn rates from member usage (30-day window)
    const totalXanax = memberUsage.reduce((s, m) => s + m.xanax, 0);
    const totalMedical = memberUsage.reduce((s, m) => s + m.medical, 0);
    const totalEnergy = memberUsage.reduce((s, m) => s + m.energy, 0);

    const checkStock = (category, itemNameMatch, label, totalUsed) => {
      const items = inventory.filter(i => i.category === category && i.name.toLowerCase().includes(itemNameMatch));
      const totalQty = items.reduce((s, i) => s + i.quantity, 0);
      const burnRate = totalUsed / 30;
      const daysLeft = burnRate > 0 ? Math.round(totalQty / burnRate) : Infinity;

      if (totalQty === 0 && totalUsed > 0) {
        warnings.push({ severity: 'critical', label, message: `Out of stock — ${totalUsed} used in 30 days`, qty: 0, burnRate: burnRate.toFixed(1) });
      } else if (daysLeft <= 3 && daysLeft !== Infinity) {
        warnings.push({ severity: 'critical', label, message: `~${daysLeft}d remaining at current burn rate`, qty: totalQty, burnRate: burnRate.toFixed(1) });
      } else if (daysLeft <= 7 && daysLeft !== Infinity) {
        warnings.push({ severity: 'warning', label, message: `~${daysLeft}d remaining at current burn rate`, qty: totalQty, burnRate: burnRate.toFixed(1) });
      } else if (totalQty > 0 && totalQty <= 10 && totalUsed > 0) {
        warnings.push({ severity: 'warning', label, message: `Low stock (${totalQty} remaining)`, qty: totalQty, burnRate: burnRate.toFixed(1) });
      }
    };

    checkStock('Drugs', 'xanax', 'Xanax', totalXanax);
    checkStock('Medical', '', 'Medical Supplies', totalMedical);

    // Check for heavily-loaned equipment
    const loanRatio = loanSummary.totalItems > 0 ? loanSummary.totalLoaned / loanSummary.totalItems : 0;
    if (loanRatio > 0.7 && loanSummary.totalLoaned > 5) {
      warnings.push({ severity: 'warning', label: 'Equipment Loans', message: `${Math.round(loanRatio * 100)}% of equipment is currently loaned out`, qty: loanSummary.totalLoaned });
    }

    return warnings;
  }, [inventory, memberUsage, loanSummary]);

  // ── Category totals ────────────────────────────────────────────────
  const categoryTotals = useMemo(() => {
    const totals = { Weapons: 0, Armor: 0, Drugs: 0, Medical: 0 };
    inventory.forEach(item => { totals[item.category] = (totals[item.category] || 0) + item.quantity; });
    return totals;
  }, [inventory]);

  return {
    loading, error, refresh,
    financials, inventory, categoryTotals,
    memberUsage, activeMembers,
    topConsumers, loanSummary, alerts,
  };
};

export default useArmoryData;
