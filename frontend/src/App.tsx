import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { HUDFrame } from './components/layout/HUDFrame';
import { MedicalDisclaimer } from './components/layout/MedicalDisclaimer';

import EntryPage from './pages/EntryPage';
import MeasurementPage from './pages/MeasurementPage';
import SessionHistoryPage from './pages/SessionHistoryPage';
import SignalLabPage from './pages/SignalLabPage';

function AppShell() {
  return (
    <div className="h-screen h-[100dvh] w-full bg-surface-950 text-white relative flex flex-col overflow-hidden">
      <HUDFrame />
      <main className="flex-1 relative z-10 pt-16 pb-10 min-h-0 flex flex-col overflow-y-auto overflow-x-hidden">
        <Outlet />
      </main>
      <MedicalDisclaimer />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<EntryPage />} />
          <Route path="/measure" element={<MeasurementPage />} />
          <Route path="/history" element={<SessionHistoryPage />} />
          <Route path="/lab" element={<SignalLabPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
