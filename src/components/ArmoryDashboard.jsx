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
  ArrowRightLeft,
} from 'lucide-react';

const CATEGORY_ICONS = {
  Weapons: Swords,
  Armor: Shield,
  Drugs: Pill,
  Medical: Heart,
};

const CATEGORY_COLORS = {
  Weapons: 'var(--hp-nerve)',
  Armor: 'var(--accent-primary)',
  Drugs: 'var(--hp-energy)',
  Medical: 'var(--hp-life)',
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
    <div className="metrics-grid metrics-grid--two">
      <div className="metric-card glow-panel">
        <div className="metric-card__icon">
          <DollarSign size={20} />
        </div>
        <div className="metric-card__content">
          <span className="text-muted">Faction Bank</span>
          <span className="metric-card__value accent-text">
            {formatCurrency(financials?.bank)}
          </span>
        </div>
      </div>
      <div className="metric-card glow-panel">
        <div className="metric-card__icon">
          <Star size={20} />
        </div>
        <div className="metric-card__content">
          <span className="text-muted">Points</span>
          <span className="metric-card__value accent-text">
            {formatNumber(financials?.points)}
          </span>
        </div>
      </div>
    </div>
  );
}

function StockAlerts({ alerts }) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="stock-alerts-section">
      <h3 className="table-header">
        <AlertTriangle size={16} />
        Stock Alerts
      </h3>
      <div className="stock-alerts-list">
        {alerts.map((alert, index) => {
          const isCritical = alert.severity === 'critical';
          const alertClass = isCritical
            ? 'stock-alert stock-alert--critical'
            : 'stock-alert stock-alert--warning';

          return (
            <div className={alertClass} key={index}>
              <div className="stock-alert__icon">
                {isCritical ? (
                  <AlertOctagon size={18} />
                ) : (
                  <AlertTriangle size={18} />
                )}
              </div>
              <div className="stock-alert__body">
                <span className="stock-alert__label">{alert.label}</span>
                <span className="stock-alert__message">{alert.message}</span>
                {alert.burnRate != null && (
                  <span className="stock-alert__burn-rate">
                    Burn rate: {alert.burnRate}/day
                  </span>
                )}
              </div>
              {alert.qty != null && (
                <span className="stock-alert__qty">{alert.qty} left</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CategoryOverview({ categoryTotals, onNavigateTab }) {
  const categories = ['Weapons', 'Armor', 'Drugs', 'Medical'];

  return (
    <div className="category-overview-section">
      <h3 className="table-header">Category Overview</h3>
      <div className="category-overview-grid">
        {categories.map((cat) => {
          const Icon = CATEGORY_ICONS[cat];
          const color = CATEGORY_COLORS[cat];
          const count = categoryTotals?.[cat] ?? 0;

          return (
            <button
              className="category-card glow-panel"
              key={cat}
              onClick={() => onNavigateTab?.('inventory', cat)}
              style={undefined}
            >
              <div
                className="category-card__border-top"
                data-category={cat.toLowerCase()}
              />
              <div className="category-card__icon">
                <Icon size={22} />
              </div>
              <span className="category-card__count">{formatNumber(count)}</span>
              <span className="category-card__label text-muted">{cat}</span>
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
    <div className="loan-summary-section">
      <h3 className="table-header">
        <ArrowRightLeft size={16} />
        Loan Summary
      </h3>
      <div className="loan-bar-container glow-panel">
        <div className="loan-bar-track">
          <div
            className="loan-bar-fill"
            data-percent={percentage}
          />
        </div>
        <span className="loan-bar-label text-muted">
          {formatNumber(loaned)} of {formatNumber(total)} items loaned ({percentage}%)
        </span>
      </div>
    </div>
  );
}

function ConsumerList({ title, consumers }) {
  return (
    <div className="consumer-list">
      <h4 className="consumer-list__title">{title}</h4>
      {!consumers || consumers.length === 0 ? (
        <p className="text-muted consumer-list__empty">No usage recorded</p>
      ) : (
        <ol className="consumer-list__rankings">
          {consumers.map((member, index) => {
            const count =
              title === 'Xanax'
                ? member.xanax
                : title === 'Medical'
                ? member.medical
                : member.energy;

            return (
              <li className="consumer-list__entry" key={member.id}>
                <span className="consumer-list__rank">{index + 1}</span>
                <span className="consumer-list__name">{member.name}</span>
                <span className="consumer-list__count accent-text">
                  {formatNumber(count)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function TopConsumers({ topConsumers }) {
  return (
    <div className="top-consumers-section">
      <h3 className="table-header">Top Consumers (30d)</h3>
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
      <CategoryOverview
        categoryTotals={categoryTotals}
        onNavigateTab={onNavigateTab}
      />
      <LoanSummary loanSummary={loanSummary} />
      <TopConsumers topConsumers={topConsumers} />
    </div>
  );
}
