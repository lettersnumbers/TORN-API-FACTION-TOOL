import { BrowserRouter, Routes, Route } from 'react-router-dom';
import FactionPage from './pages/FactionPage';
import FactionWarRoom from './pages/FactionWarRoom';
import FactionAttacks from './pages/FactionAttacks';
import FactionArmory from './pages/FactionArmory';
import FactionFunds from './pages/FactionFunds';
import PastWars from './pages/PastWars';
import FactionBattleStats from './pages/FactionBattleStats';
import { UserCrimes, UserStats, UserTravel, UserBattleStats } from './pages/UserSubPages';
import UserPage from './pages/UserPage';
import Layout from './components/Layout';

import { DataProvider } from './context/DataContext';

function App() {
  return (
    <DataProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<FactionPage />} />
            <Route path="/faction/war-room" element={<FactionWarRoom />} />
            <Route path="/faction/attacks" element={<FactionAttacks />} />
            <Route path="/faction/armory" element={<FactionArmory />} />
            <Route path="/faction/funds" element={<FactionFunds />} />
            <Route path="/faction/past-wars" element={<PastWars />} />
            <Route path="/faction/battle-stats" element={<FactionBattleStats />} />
            
            <Route path="/user" element={<UserPage />} />
            <Route path="/user/crimes" element={<UserCrimes />} />
            <Route path="/user/stats" element={<UserStats />} />
            <Route path="/user/travel" element={<UserTravel />} />
            <Route path="/user/battle-stats" element={<UserBattleStats />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </DataProvider>
  );
}

export default App;
