import React from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield, LayoutDashboard, Users, FileText, Settings,
  LogOut, ExternalLink, AlertTriangle, MapPin, LayoutGrid,
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;

  const navItems = [
    { name: 'Overview', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'User Management', path: '/admin/users', icon: Users },
    { name: 'Audit Log', path: '/admin/audit-log', icon: FileText },
    { name: 'Roles & Permissions', path: '/admin/roles-permissions', icon: Settings },
    { name: 'Locations', path: '/admin/locations', icon: MapPin },
    { name: 'Custom Dashboards', path: '/admin/custom-dashboard', icon: LayoutGrid },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <div className="app-container admin-shell">
      {/* Admin Sidebar */}
      <aside className="sidebar admin-sidebar">
        {/* Admin brand */}
        <div className="sidebar-logo admin-sidebar-logo">
          <Shield size={22} />
          <div>
            <span style={{ display: 'block', fontSize: '14px', fontWeight: 700 }}>Admin Console</span>
            <span style={{ display: 'block', fontSize: '10px', opacity: 0.5, letterSpacing: '0.05em', textTransform: 'uppercase' }}>TargetTrack</span>
          </div>
        </div>

        {/* Warning badge */}
        <div className="admin-portal-indicator">
          <AlertTriangle size={11} />
          <span>Admin Portal</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <div
                key={item.path}
                id={`admin-nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                className={`nav-item admin-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {/* View main app link — reuses same session, no re-login */}
          <div
            className="admin-view-app-link"
            onClick={() => navigate('/dashboard')}
            style={{ cursor: 'pointer', marginBottom: '12px' }}
          >
            <ExternalLink size={14} />
            <span>View Main App</span>
          </div>

          <div className="user-profile">
            <div className="user-avatar admin-user-avatar">
              {user.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-role" style={{ color: 'var(--admin-accent, #f59e0b)' }}>
                {user.roles.join(', ').replace('_', ' ')}
              </span>
            </div>
          </div>

          <button className="btn-logout" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Admin main content */}
      <div className="main-wrapper">
        <header className="header admin-header">
          <div className="header-title-container">
            <AdminPageTitle pathname={location.pathname} />
          </div>
          <div className="admin-header-badge">
            <Shield size={13} />
            <span>Admin Session</span>
          </div>
        </header>
        <Outlet />
      </div>
    </div>
  );
};

const AdminPageTitle: React.FC<{ pathname: string }> = ({ pathname }) => {
  const titles: Record<string, { title: string; subtitle: string }> = {
    '/admin/dashboard': { title: 'Admin Overview', subtitle: 'User counts by role, recent audit activity.' },
    '/admin/users': { title: 'User Management', subtitle: 'Invite, manage roles, and control access.' },
    '/admin/audit-log': { title: 'Audit Log', subtitle: 'Full chronological record of system events.' },
    '/admin/roles-permissions': { title: 'Roles & Permissions', subtitle: 'View the access control matrix.' },
    '/admin/locations': { title: 'Location Management', subtitle: 'Manage site locations and assignments.' },
    '/admin/custom-dashboard': { title: 'Custom Dashboards', subtitle: 'Manage custom drag-and-drop dashboards and widgets.' },
  };

  const match = Object.entries(titles).find(([key]) => pathname.startsWith(key));
  const { title, subtitle } = match?.[1] ?? { title: 'Admin Console', subtitle: 'System administration.' };

  return (
    <>
      <h1 className="header-title">{title}</h1>
      <span className="header-subtitle">{subtitle}</span>
    </>
  );
};
