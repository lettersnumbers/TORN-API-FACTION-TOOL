import React from 'react';
import {
  DollarSign,
  Star,
  AlertTriangle,
  AlertOctagon,
  Swords,
  Shield,
  Pill,
  Heart,
} from 'lucide-react';

const CATEGORY_ICONS = {
  Weapons: Swords,
  Armor: Shield,
  Drugs: Pill,
  Medical: Heart,
};

function formatCurrency(value) {
  if (value == null) return '$0';
  return '$' + Number(value).toLocaleString();
}

function formatNumber(value) {
  if (value == null) return '0';
  return Number(value).toLocaleString();
}

function FinancialSummary({ financials }) {
  return (
    <div className="metrics-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <div className="metric-card">
        <h3><DollarSign size={16} /> Faction Bank</h3>
        <div className="metric-value accent-text">{formatCurrency(financials?.bank)}</div>
      </div>
      <div className="metric-card">
        <h3><Star size={16} /> Points</h3>
        <div className="metric-value">{formatNumber(financials?.points)}</div>
      </div>
    </div>
  );
}

function StockAlerts({ alerts }) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="armory-section">
      <h3 className="armory-section-title">Stock Alerts</h3>
      {alerts.map((alert, index) => (
        <div
          className={`stock-alert ${alert.severity === 'critical' ? 'stock-alert--critical' : 'stock-alert--warning'}`}
          key={index}
        >
          {alert.severity === 'critical'
            ? <AlertOctagon size={16} className="stock-alert-icon" />
            : <AlertTriangle size={16} className="stock-alert-icon" />
          }
          <div className="stock-alert-body">
            <div className="stock-alert-label">{alert.label}</div>
            <div className="stock-alert-message">{alert.message}</div>
            {alert.burnRate != null && (
              <div className="stock-alert-rate">Burn rate: {alert.burnRate}/day</div>
            )}
          </div>
          {alert.qty != null && (
            <span className="stock-alert-qty accent-text">{alert.qty} left</span>
          )}
        </div>
      ))}
    </div>
  );
}

function CategoryOverview({ categoryTotals, onNavigateTab }) {
  const categories = ['Weapons', 'Armor', 'Drugs', 'Medical'];

  return (
    <div className="armory-section">
      <h3 className="armory-section-title">Category Overview</h3>
      <div className="category-cards-grid">
        {categories.map((cat) => {
          const Icon = CATEGORY_ICONS[cat];
          const count = categoryTotals?.[cat] ?? 0;

          return (
            <button
              className={`category-card category-card--${cat.toLowerCase()}`}
              key={cat}
              onClick={() => onNavigateTab?.('inventory', cat)}
            >
              <Icon size={22} className="category-card-icon" />
              <span className="category-card-count">{formatNumber(count)}</span>
              <span className="category-card-label text-muted">{cat}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LoanSummary({ loanSummary }) {
  const total = loanSummary?.totalItems ?? 0;
  const loaned = loanSummary?.totalLoaned ?? 0;
  const percentage = total > 0 ? Math.round((loaned / total) * 100) : 0;

  return (
    <div className="armory-section">
      <h3 className="armory-section-title">Loan Summary</h3>
      <div className="loan-bar-container">
        <div className="loan-bar-fill" style={{ width: `${percentage}%` }} />
      </div>
      <div className="loan-bar-label">
        {formatNumber(loaned)} of {formatNumber(total)} items loaned ({percentage}%)
      </div>
    </div>
  );
}

function ConsumerList({ title, consumers }) {
  return (
    <div className="consumer-list glow-panel">
      <h3>{title}</h3>
      {!consumers || consumers.length === 0 ? (
        <div className="consumer-empty">No usage recorded</div>
      ) : (
        consumers.map((member, index) => {
          const count =
            title === 'Xanax' ? member.xanax
            : title === 'Medical' ? member.medical
            : member.energy;

          return (
            <div className="consumer-entry" key={member.id}>
              <span className="consumer-rank">{index + 1}.</span>
              <span className="consumer-name">{member.name}</span>
              <span className="consumer-count accent-text">{formatNumber(count)}</span>
            </div>
          );
        })
      )}
    </div>
  );
}

function TopConsumers({ topConsumers }) {
  return (
    <div className="armory-section">
      <h3 className="armory-section-title">Top Consumers (30d)</h3>
      <div className="top-consumers-grid">
        <ConsumerList title="Xanax" consumers={topConsumers?.xanax} />
        <ConsumerList title="Medical" consumers={topConsumers?.medical} />
        <ConsumerList title="Energy" consumers={topConsumers?.energy} />
      </div>
    </div>
  );
}

export default function ArmoryDashboard({
  financials,
  categoryTotals,
  loanSummary,
  alerts,
  topConsumers,
  onNavigateTab,
}) {
  return (
    <div className="armory-dashboard">
      <FinancialSummary financials={financials} />
      <StockAlerts alerts={alerts} />
      <CategoryOverview categoryTotals={categoryTotals} onNavigateTab={onNavigateTab} />
      <LoanSummary loanSummary={loanSummary} />
      <TopConsumers topConsumers={topConsumers} />
    </div>
  );
}
