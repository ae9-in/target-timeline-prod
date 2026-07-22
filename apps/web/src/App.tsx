import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { MasterTargetTracker } from './pages/MasterTargetTracker';
import { TargetDetails } from './pages/TargetDetails';
import { Timeline } from './pages/Timeline';
import { Calendar } from './pages/Calendar';
import { DepartmentPerformance } from './pages/DepartmentPerformance';
import { Analytics } from './pages/Analytics';
import { Alerts } from './pages/Alerts';
import { WeeklyReports } from './pages/WeeklyReports';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div 
        style={{ 
          height: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#0a0b10',
          color: '#f3f4f6',
          fontFamily: 'sans-serif'
        }}
      >
        <span>Loading TargetTrack Secure Portal...</span>
      </div>
    );
  }

  // Guard: if not logged in, only allow accessing /admin/login
  if (!user) {
    if (location.pathname === '/admin/login') {
      return <Login />;
    }
    return <Navigate to="/admin/login" replace />;
  }

  // If already logged in, redirect away from the login page to dashboard
  if (location.pathname === '/admin/login') {
    return <Navigate to="/" replace />;
  }

  const roles = user.roles || [];
  const hasLeadershipScope = roles.includes('SUPER_ADMIN') || roles.includes('LEADERSHIP');

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-wrapper">
        <Header />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/targets" element={<MasterTargetTracker />} />
          <Route path="/targets/:id" element={<TargetDetails />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/performance" element={<DepartmentPerformance />} />
          
          {/* Protected Routes */}
          <Route 
            path="/analytics" 
            element={hasLeadershipScope ? <Analytics /> : <Navigate to="/" replace />} 
          />
          <Route path="/alerts" element={<Alerts />} />
          <Route 
            path="/reports" 
            element={hasLeadershipScope ? <WeeklyReports /> : <Navigate to="/" replace />} 
          />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
