import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DepartmentProvider } from './context/DepartmentContext';
import { LocationProvider } from './context/LocationContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AdminLayout } from './layouts/AdminLayout';
import { Login } from './pages/Login';
import { SignUpPage } from './pages/SignUpPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { AcceptInvitePage } from './pages/AcceptInvitePage';
import { Dashboard } from './pages/Dashboard';
import { MasterTargetTracker } from './pages/MasterTargetTracker';
import { TargetDetails } from './pages/TargetDetails';
import { Timeline } from './pages/Timeline';
import { Calendar } from './pages/Calendar';
import { DepartmentPerformance } from './pages/DepartmentPerformance';
import { DepartmentManagement } from './pages/DepartmentManagement';
import { Analytics } from './pages/Analytics';
import { Alerts } from './pages/Alerts';
import { WeeklyReports } from './pages/WeeklyReports';
import { LocationManagement } from './pages/LocationManagement';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminAuditLog } from './pages/admin/AdminAuditLog';
import { AdminRolesPermissions } from './pages/admin/AdminRolesPermissions';

// ─── Guard: blocks non-SUPER_ADMIN from the entire /admin/* subtree ───────────
const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/admin/login" replace />;
  if (!user.roles.includes('SUPER_ADMIN')) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

// ─── Guard: blocks non-SUPER_ADMIN from Settings pages ──────────────────────
const SettingsGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!user.roles.includes('SUPER_ADMIN')) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

// ─── Guard: forces password change before any protected page ────────────────
const MustChangePasswordGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (user?.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }
  return <>{children}</>;
};

// ─── Main app content (Sidebar + Header + routes) ────────────────────────────
const MainAppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#0a0b10', color: '#f3f4f6', fontFamily: 'sans-serif',
      }}>
        <span>Loading TargetTrack Secure Portal...</span>
      </div>
    );
  }

  // Unauthenticated — redirect to login
  if (!user) return <Navigate to="/login" replace />;

  // Force password change before any other access
  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  const roles = user.roles || [];
  const hasLeadershipScope = roles.includes('SUPER_ADMIN') || roles.includes('LEADERSHIP');

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-wrapper">
        <Header />
        <MustChangePasswordGuard>
          <Routes>
            {/* Canonical main app routes — all with proper /path names */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/targets" element={<MasterTargetTracker />} />
            <Route path="/targets/:id" element={<TargetDetails />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/departments" element={<DepartmentManagement />} />
            <Route path="/performance" element={<DepartmentPerformance />} />
            <Route
              path="/analytics"
              element={hasLeadershipScope ? <Analytics /> : <Navigate to="/dashboard" replace />}
            />
            <Route path="/alerts" element={<Alerts />} />
            <Route
              path="/reports"
              element={hasLeadershipScope ? <WeeklyReports /> : <Navigate to="/dashboard" replace />}
            />

            {/* Settings — Super Admin only, renders admin pages inside main app shell */}
            <Route
              path="/settings/users"
              element={<SettingsGuard><AdminUsers /></SettingsGuard>}
            />
            <Route
              path="/settings/audit-log"
              element={<SettingsGuard><AdminAuditLog /></SettingsGuard>}
            />
            <Route
              path="/settings/roles-permissions"
              element={<SettingsGuard><AdminRolesPermissions /></SettingsGuard>}
            />
            <Route
              path="/settings/locations"
              element={<SettingsGuard><LocationManagement /></SettingsGuard>}
            />
            <Route path="/settings" element={<Navigate to="/settings/users" replace />} />

            {/* Legacy root redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            {/* Catch any /admin/* attempts in the main app — neutral redirect */}
            <Route path="/admin/*" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </MustChangePasswordGuard>
      </div>
    </div>
  );
};

// ─── Root app with two separate route trees ───────────────────────────────────
const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#0a0b10', color: '#f3f4f6', fontFamily: 'sans-serif',
      }}>
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <Routes>
      {/* ── Public routes ────────────────────────────────────────────────────── */}
      <Route
        path="/login"
        element={
          user && !user.mustChangePassword
            ? <Navigate to="/dashboard" replace />
            : <Login portal="user" />
        }
      />
      <Route
        path="/signup"
        element={
          user && !user.mustChangePassword
            ? <Navigate to="/dashboard" replace />
            : <SignUpPage />
        }
      />
      <Route
        path="/forgot-password"
        element={
          user && !user.mustChangePassword
            ? <Navigate to="/dashboard" replace />
            : <ForgotPasswordPage />
        }
      />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route
        path="/admin/login"
        element={
          user && user.roles.includes('SUPER_ADMIN') && !user.mustChangePassword
            ? <Navigate to="/admin/dashboard" replace />
            : <Login portal="admin" />
        }
      />
      {/* Invite acceptance — no auth required */}
      <Route path="/accept-invite" element={<AcceptInvitePage />} />

      {/* ── Force-change-password — authenticated, any role ───────────────── */}
      <Route
        path="/change-password"
        element={user ? <ChangePasswordPage /> : <Navigate to="/login" replace />}
      />

      {/* ── Admin portal — physically separate subtree ────────────────────── */}
      <Route
        path="/admin/*"
        element={
          <AdminGuard>
            <AdminLayout />
          </AdminGuard>
        }
      >
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="audit-log" element={<AdminAuditLog />} />
        <Route path="roles-permissions" element={<AdminRolesPermissions />} />
        <Route path="locations" element={<LocationManagement />} />
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
      </Route>

      {/* ── Main app — all other routes ───────────────────────────────────── */}
      <Route path="/*" element={<MainAppContent />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <DepartmentProvider>
          <Router>
            <AppContent />
          </Router>
        </DepartmentProvider>
      </LocationProvider>
    </AuthProvider>
  );
}

export default App;
