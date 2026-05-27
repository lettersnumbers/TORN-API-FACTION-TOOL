import React, { createContext, useState, useContext } from 'react';

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  const [userName, setUserName] = useState('User Profile');
  const [factionName, setFactionName] = useState('Faction Data');
  const [hospitalCount, setHospitalCount] = useState(0);
  const [userHospitalStatus, setUserHospitalStatus] = useState(0);
  const [currentPlayerId, setCurrentPlayerId] = useState(
    parseInt(localStorage.getItem('tornPlayerId') || '0') || null
  );

  const updateCurrentPlayerId = (id) => {
    if (id) localStorage.setItem('tornPlayerId', String(id));
    setCurrentPlayerId(id);
  };

  return (
    <DataContext.Provider value={{
      userName, setUserName,
      factionName, setFactionName,
      hospitalCount, setHospitalCount,
      userHospitalStatus, setUserHospitalStatus,
      currentPlayerId, setCurrentPlayerId: updateCurrentPlayerId,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useDataContext = () => useContext(DataContext);
