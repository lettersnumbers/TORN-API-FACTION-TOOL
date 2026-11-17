import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import useArmoryData from '../hooks/useArmoryData';
import { useDataContext } from '../context/DataContext';
import ArmoryDashboard from '../components/ArmoryDashboard';
import ArmoryInventory from '../components/ArmoryInventory';
import ArmoryUsageLog from '../components/ArmoryUsageLog';

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'usage', label: 'Usage Log' },
];

const FactionArmory = () => {
  const { factionName } = useDataContext();
  const data = useArmoryData();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [inventoryCategory, setInventoryCategory] = useState('All');

  const onNavigateTab = (tab, category) => {
    setActiveTab(tab);
    if (category) setInventoryCategory(category);
  };

  const renderContent = () => {
    if (data.error) {
      return (
        <div className="access-denied-panel glow-panel p-4">
          <h2 className="text-danger">Access Denied</h2>
          <p className="text-muted">Your API Key does not have the required faction permissions to view the Armory.</p>
          <div className="text-sm">{data.error}</div>
        </div>
      );
    }

    if (data.loading) {
      return <div className="text-center py-4">Scanning Vaults...</div>;
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <ArmoryDashboard
            financials={data.financials}
            categoryTotals={data.categoryTotals}
            loanSummary={data.loanSummary}
            alerts={data.alerts}
            topConsumers={data.topConsumers}
            onNavigateTab={onNavigateTab}
          />
        );
      case 'inventory':
        return (
          <ArmoryInventory
            inventory={data.inventory}
            initialCategory={inventoryCategory}
          />
        );
      case 'usage':
        return (
          <ArmoryUsageLog
            memberUsage={data.memberUsage}
            activeMembers={data.activeMembers}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="page-container">
      <div className="page-header d-flex-between">
        <div>
          <h1>Armory :: <span className="accent-text">{factionName}</span></h1>
          <p>Supply chain intelligence &amp; member accountability.</p>
        </div>
        <div className="view-toggle-group">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`action-button small ${activeTab === tab.key ? 'active' : 'outline'}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
          <button
            className="action-button small outline"
            onClick={data.refresh}
            title="Refresh armory data"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {renderContent()}
    </div>
  );
};

export default FactionArmory;
