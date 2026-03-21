import React, { useState, useEffect } from 'react';
import { useDataContext } from '../context/DataContext';
import { fetchFactionBalances, fetchFactionDepositNews, fetchFactionPayoutNews, fetchFactionData } from '../services/api';

const FactionFunds = () => {
  const { factionName } = useDataContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fundsData, setFundsData] = useState([]);
  const [factionBank, setFactionBank] = useState(0);
  
  const [sortConfig, setSortConfig] = useState({ key: 'balance', direction: 'descending' });
  const [expandedRow, setExpandedRow] = useState(null);
  const [timeFilter, setTimeFilter] = useState(30 * 86400); // Default 30 days

  useEffect(() => {
    document.documentElement.style.setProperty('--accent-primary', '#10b981');
    document.documentElement.style.setProperty('--accent-secondary', '#f59e0b');
    document.documentElement.style.setProperty('--accent-glow', 'rgba(16, 185, 129, 0.4)');
    document.documentElement.style.setProperty('--bg-main', 'radial-gradient(circle at top right, #05140a 0%, #02040a 100%)');

    return () => {
      document.documentElement.style.setProperty('--accent-primary', '#00f0ff');
      document.documentElement.style.setProperty('--accent-secondary', '#ff003c');
      document.documentElement.style.setProperty('--accent-glow', 'rgba(0, 240, 255, 0.4)');
      document.documentElement.style.setProperty('--bg-main', 'radial-gradient(circle at top, #02101a 0%, #02040a 100%)');
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadInfo = async () => {
      setLoading(true);
      try {
        const balRes = await fetchFactionBalances();
        const depRes = await fetchFactionDepositNews().catch(() => ({ news: [] }));
        const payRes = await fetchFactionPayoutNews().catch(() => ({ news: [] }));
        const factionRes = await fetchFactionData().catch(() => ({ members: {} }));
        
        if (active) {
          if (balRes.balance) {
             const facBank = balRes.balance.faction?.money || balRes.balance.money || 0;
             setFactionBank(facBank);
          }
          const formatted = buildFundsTable(depRes, payRes, factionRes.members || {}, balRes, timeFilter);
          setFundsData(formatted);
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadInfo();
    return () => { active = false; };
  }, [timeFilter]); // Re-run when the time filter directly changes

  const buildFundsTable = (deposits, payouts, members, balRes, timeFilterValue) => {
    const map = {};
    const memArray = Array.isArray(members) ? members : Object.values(members || {});
    
    const initUser = (nameStr) => {
      if (!nameStr) return null;
      const key = nameStr.trim().toLowerCase();
      if (!map[key]) {
        map[key] = {
          name: nameStr.trim(),
          deposited: 0,
          withdrawn: 0,
          balance: 0,
          history: [],
        };
      }
      return key;
    };

    // Pre-populate with EVERY faction member just in case
    memArray.forEach(m => {
       if (m.name) initUser(m.name);
    });

    // 1. Process active balances
    // V2 Returns: { balance: { faction: { money: X }, members: [ { id: 1234, username: 'Name', money: Y } ] } }
    const donationsRaw = balRes?.balance?.members || balRes?.balance?.donations || balRes?.members || balRes?.donations || [];
    const donationsList = Array.isArray(donationsRaw) ? donationsRaw : Object.values(donationsRaw);
    
    donationsList.forEach(b => {
       if (!b) return;
       // Attempt to read the username locally if Torn supplies it, otherwise cross-reference the exact ID
       let memberName = b.username || b.name;
       if (!memberName && b.id && members && members[b.id]) {
          memberName = members[b.id].name;
       }

       if (memberName) {
          const key = initUser(memberName);
          if (key) {
             map[key].balance = parseInt(b.money || b.money_balance || b.balance || 0, 10);
          }
       }
    });

    const depList = Array.isArray(deposits) ? deposits : (deposits?.news || deposits?.text || []);
    const payList = Array.isArray(payouts) ? payouts : (payouts?.news || payouts?.text || []);

    const processLogs = (logList) => {
      const cutoff = timeFilterValue > 0 ? (Math.floor(Date.now() / 1000) - timeFilterValue) : 0;
      
      logList.forEach(log => {
         // Skip processing if log is older than exact filter timestamp
         if (cutoff > 0 && log.timestamp < cutoff) return;
         
         const txt = (log.text || log.news || '').replace(/<[^>]+>/g, '').trim();
         if (!txt) return;

         // "Name deposited $X"
         let dMatch = txt.match(/^([^ ]+)\s+deposited\s+\$([0-9,]+)/i);
         if (dMatch) {
            const name = dMatch[1];
            const amt = parseInt(dMatch[2].replace(/,/g, ''), 10) || 0;
            const key = initUser(name);
            if (key) {
               map[key].deposited += amt;
               map[key].history.push({ time: log.timestamp, text: txt, type: 'deposit', amount: amt });
            }
            return;
         }

         // "Name withdrew $X"
         let wMatch = txt.match(/^([^ ]+)\s+withdrew\s+\$([0-9,]+)/i);
         if (wMatch) {
            const name = wMatch[1];
            const amt = parseInt(wMatch[2].replace(/,/g, ''), 10) || 0;
            const key = initUser(name);
            if (key) {
               map[key].withdrawn += amt;
               map[key].history.push({ time: log.timestamp, text: txt, type: 'withdrawal', amount: amt });
            }
            return;
         }

         // "Name was given $X by Sender"
         let givenMatch = txt.match(/^([^ ]+)\s+was given\s+\$([0-9,]+)\s+by\s+[^ ]+/i);
         if (givenMatch) {
            const name = givenMatch[1];
            const amt = parseInt(givenMatch[2].replace(/,/g, ''), 10) || 0;
            const key = initUser(name);
            if (key) {
               map[key].withdrawn += amt;
               map[key].history.push({ time: log.timestamp, text: txt, type: 'withdrawal', amount: amt });
            }
            return;
         }

         // Fallback for "increased" or "decreased"
         let incMatch = txt.match(/(increased|decreased)\s+([^ ]+)'s.*?money balance by\s+\$([0-9,]+)/i);
         if (incMatch) {
            const verb = incMatch[1].toLowerCase();
            const targetName = incMatch[2];
            const amt = parseInt(incMatch[3].replace(/,/g, ''), 10) || 0;
            
            const key = initUser(targetName);
            if (key) {
               if (verb === 'increased') {
                  map[key].deposited += amt;
                  map[key].history.push({ time: log.timestamp, text: txt, type: 'deposit', amount: amt });
               } else if (verb === 'decreased') {
                  map[key].withdrawn += amt;
                  map[key].history.push({ time: log.timestamp, text: txt, type: 'withdrawal', amount: amt });
               }
            }
            return;
         }
      });
    };

    processLogs(depList);
    processLogs(payList);

    // Initial Filter out empty rows
    return Object.values(map)
      .filter(u => u.deposited > 0 || u.withdrawn > 0 || u.balance > 0 || memArray.find(m => m.name.toLowerCase() === u.name.toLowerCase()));
  };

  const handleSort = (key) => {
    let direction = 'descending';
    if (sortConfig.key === key && sortConfig.direction === 'descending') {
      direction = 'ascending';
    }
    setSortConfig({ key, direction });
  };

  // Sort data dynamically
  const sortedData = React.useMemo(() => {
    let sortableItems = [...fundsData];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [fundsData, sortConfig]);

  const formatCurrency = (val) => {
     if (!val) return '-';
     return '$' + val.toLocaleString();
  };

  return (
    <div className="page-container">
      <div className="page-header d-flex-between">
        <div>
          <h1>Faction Funds :: <span className="accent-text">{factionName}</span></h1>
          <p>Vault balance tracker and 30-day member payout ledger.</p>
        </div>
        <button className="action-button small" onClick={() => window.location.reload()}>Refresh Ledger</button>
      </div>

      {error ? (
        <div className="glow-panel p-4 text-center mt-4">
          <h2 style={{color: 'var(--hp-nerve)', marginBottom: '16px'}}>Access Denied</h2>
          <p className="text-muted">Your API Key does not have the required permissions to view the Faction Vault.</p>
          <div style={{fontSize: '0.85rem', marginTop: '8px'}}>{error}</div>
        </div>
      ) : loading ? (
        <div className="text-center py-4">Auditing Vault transactions...</div>
      ) : (
        <>
          <div className="metrics-grid mb-4">
            <div className="metric-card" style={{ borderLeft: '3px solid var(--accent-primary)' }}>
              <h3>Current Vault Balance</h3>
              <div className="metric-value" style={{ color: 'var(--accent-primary)' }}>
                ${(factionBank || 0).toLocaleString()}
              </div>
            </div>
            <div className="metric-card">
              <h3 title="Total pooled deposits in the last 30 days">Gross Deposits (30d)</h3>
              <div className="metric-value">
                ${fundsData.reduce((acc, curr) => acc + curr.deposited, 0).toLocaleString()}
              </div>
            </div>
            <div className="metric-card">
              <h3 title="Total withdrawals processed from the vault">Total Withdrawals (30d)</h3>
              <div className="metric-value" style={{ color: 'var(--hp-life)' }}>
                ${fundsData.reduce((acc, curr) => acc + curr.withdrawn, 0).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="table-responsive glow-panel mt-4">
            <div className="table-header d-flex-between" style={{ padding: '20px 24px' }}>
               <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <span className="pulse-dot" style={{ backgroundColor: 'var(--accent-primary)' }}></span>
                 Faction Ledger
               </h2>
               <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.4)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                 {[
                   { label: '1 Day', val: 86400 },
                   { label: '1 Week', val: 7 * 86400 },
                   { label: '2 Weeks', val: 14 * 86400 },
                   { label: '30 Days', val: 30 * 86400 },
                   { label: 'All', val: 0 }
                 ].map(opt => (
                   <button 
                     key={opt.label}
                     onClick={() => setTimeFilter(opt.val)}
                     style={{
                       background: timeFilter === opt.val ? 'var(--accent-primary)' : 'transparent',
                       color: timeFilter === opt.val ? '#000' : 'var(--text-muted)',
                       border: 'none', padding: '6px 14px', borderRadius: '6px', 
                       fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s',
                       textTransform: 'uppercase', letterSpacing: '0.5px'
                     }}
                   >
                     {opt.label}
                   </button>
                 ))}
               </div>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('name')}>
                    MEMBER {sortConfig.key === 'name' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ cursor: 'pointer', color: 'var(--accent-primary)' }} onClick={() => handleSort('deposited')}>
                    DEPOSITS {sortConfig.key === 'deposited' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ cursor: 'pointer', color: 'var(--hp-life)' }} onClick={() => handleSort('withdrawn')}>
                    WITHDRAWALS {sortConfig.key === 'withdrawn' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ cursor: 'pointer', color: '#ffaa00' }} onClick={() => handleSort('balance')}>
                    BALANCE {sortConfig.key === 'balance' ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : ''}
                  </th>
                </tr>
              </thead>
              <tbody>
                 {sortedData.length === 0 && (
                   <tr><td colSpan="4" className="text-center text-muted">No vault transactions found in the last 30 days.</td></tr>
                 )}
                 {sortedData.map(u => {
                   const isExpanded = expandedRow === u.name;
                   return (
                     <React.Fragment key={u.name}>
                       <tr onClick={() => setExpandedRow(isExpanded ? null : u.name)} style={{ cursor: 'pointer', backgroundColor: isExpanded ? 'rgba(0,0,0,0.2)' : 'transparent' }}>
                         <td style={{fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="text-muted" style={{ fontSize: '0.7em' }}>{isExpanded ? '▼' : '▶'}</span>
                            {u.name}
                         </td>
                         <td style={{color: 'var(--accent-primary)'}}>{formatCurrency(u.deposited)}</td>
                         <td style={{color: 'var(--hp-life)'}}>{formatCurrency(u.withdrawn)}</td>
                         <td style={{color: '#ffaa00', fontWeight: 'bold'}}>{formatCurrency(u.balance)}</td>
                       </tr>
                       {isExpanded && (
                         <tr>
                            <td colSpan="4" style={{ padding: 0, backgroundColor: 'rgba(0,0,0,0.4)', borderBottom: '1px solid var(--border-color)' }}>
                               <div style={{ padding: '16px', maxHeight: '400px', overflowY: 'auto' }}>
                                  <h4 style={{ color: 'var(--text-main)', marginTop: 0, marginBottom: '12px' }}>30-Day Ledger History</h4>
                                  {u.history.length === 0 ? (
                                     <div className="text-muted text-sm">No transaction records found matching this member's aliases.</div>
                                  ) : (
                                     <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                                        <tbody>
                                           {u.history.sort((a,b) => b.time - a.time).map((log, i) => {
                                              const date = new Date(log.time * 1000).toLocaleString();
                                              const isDep = log.type === 'deposit';
                                              return (
                                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                   <td style={{ padding: '6px 0', color: 'var(--text-muted)' }}>{date}</td>
                                                   <td style={{ padding: '6px 0', color: isDep ? 'var(--accent-primary)' : 'var(--hp-life)', fontWeight: 'bold', minWidth: '100px' }}>
                                                      {isDep ? '+' : '-'}${log.amount.toLocaleString()}
                                                   </td>
                                                   <td style={{ padding: '6px 0', color: 'var(--text-main)' }}>{log.text}</td>
                                                </tr>
                                              );
                                           })}
                                        </tbody>
                                     </table>
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
        </>
      )}
    </div>
  );
};

export default FactionFunds;
