import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import CreateTripPage from './pages/CreateTripPage';
import ItineraryBuilderPage from './pages/ItineraryBuilderPage';
import ItineraryPage from './pages/ItineraryPage';
import BudgetPage from './pages/BudgetPage';
import ChecklistPage from './pages/ChecklistPage';
import NotesPage from './pages/NotesPage';
import DiscoveryPage from './pages/DiscoveryPage';
import SharedTripPage from './pages/SharedTripPage';
import HotelPage from './pages/HotelPage';

function App() {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('traveloop-user');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('traveloop-user', JSON.stringify(user));
    } else {
      localStorage.removeItem('traveloop-user');
    }
  }, [user]);

  function requireUser(element) {
    return user ? element : <Navigate to="/" replace />;
  }

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<HomePage user={user} onAuth={setUser} />} />
        <Route path="/dashboard" element={requireUser(<DashboardPage user={user} onLogout={() => setUser(null)} />)} />
        <Route path="/create" element={requireUser(<CreateTripPage user={user} />)} />
        <Route path="/trip/:tripId" element={requireUser(<ItineraryBuilderPage user={user} />)} />
        <Route path="/trip/:tripId/view" element={requireUser(<ItineraryPage />)} />
        <Route path="/trip/:tripId/budget" element={requireUser(<BudgetPage />)} />
        <Route path="/trip/:tripId/checklist" element={requireUser(<ChecklistPage />)} />
        <Route path="/trip/:tripId/notes" element={requireUser(<NotesPage />)} />
        <Route path="/trip/:tripId/discovery" element={requireUser(<DiscoveryPage />)} />
        <Route path="/trip/:tripId/hotels" element={requireUser(<HotelPage />)} />
        <Route path="/share/:publicCode" element={<SharedTripPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
