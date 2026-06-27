import React, { useState } from 'react';
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import PinGate from './components/PinGate';
import Dashboard from './pages/Dashboard';
import ResinNew from './pages/ResinNew';
import ResinDetail from './pages/ResinDetail';
import ExperimentNew from './pages/ExperimentNew';
import ExperimentDetail from './pages/ExperimentDetail';
import Analysis from './pages/Analysis';

function Topbar() {
  return (
    <nav className="topbar">
      <div className="topbar-brand">
        ⬡ LMM<span>/lab</span>
      </div>
      <div className="topbar-nav">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>Home</NavLink>
        <NavLink to="/resin/new" className={({ isActive }) => isActive ? 'active' : ''}>+ Resin</NavLink>
        <NavLink to="/experiment/new" className={({ isActive }) => isActive ? 'active' : ''}>+ Experiment</NavLink>
        <NavLink to="/analysis" className={({ isActive }) => isActive ? 'active' : ''}>Analysis</NavLink>
      </div>
    </nav>
  );
}

export default function App() {
  const [unlocked, setUnlocked] = useState(
    sessionStorage.getItem('lmm_unlocked') === '1'
  );

  if (!unlocked) return <PinGate onUnlock={() => setUnlocked(true)} />;

  return (
    <HashRouter>
      <div className="app">
        <Topbar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/resin/new" element={<ResinNew />} />
          <Route path="/resin/:id" element={<ResinDetail />} />
          <Route path="/experiment/new" element={<ExperimentNew />} />
          <Route path="/experiment/:id" element={<ExperimentDetail />} />
          <Route path="/analysis" element={<Analysis />} />
        </Routes>
      </div>
    </HashRouter>
  );
}
