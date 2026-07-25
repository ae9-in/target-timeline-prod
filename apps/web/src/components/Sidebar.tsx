import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Target,
  Clock,
  Calendar,
  Users,
  BarChart3,
  AlertTriangle,
  FileText,
  LogOut,
  Building2,
  MapPin,
  Settings,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  ScrollText,
  Lock,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(() =>
    location.pathname.startsWith('/settings')
  );

  if (!user) return null;

  const roles = user.roles || [];
  const isSuperAdmin = roles.includes('SUPER_ADMIN');
  const isLeadership = roles.includes('LEADERSHIP');
  const showAnalytics = isSuperAdmin || isLeadership;
  const showReports = isSuperAdmin || isLeadership;

  const mainNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Target Tracker', path: '/targets', icon: Target },
    { name: 'Gantt Timeline', path: '/timeline', icon: Clock },
    { name: 'Calendar', path: '/calendar', icon: Calendar },
    { name: 'Departments', path: '/departments', icon: Building2 },
    { name: 'Department Performance', path: '/performance', icon: Users },
    ...(showAnalytics ? [{ name: 'Analytics', path: '/analytics', icon: BarChart3 }] : []),
    { name: 'Alerts & Risks', path: '/alerts', icon: AlertTriangle },
    ...(showReports ? [{ name: 'Weekly Reports', path: '/reports', icon: FileText }] : []),
  ];

  const settingsItems = isSuperAdmin ? [
    { name: 'User Management', path: '/settings/users', icon: Users },
    { name: 'Audit Log', path: '/settings/audit-log', icon: ScrollText },
    { name: 'Roles & Permissions', path: '/settings/roles-permissions', icon: Lock },
    { name: 'Locations', path: '/settings/locations', icon: MapPin },
  ] : [];

  const isSettingsActive = location.pathname.startsWith('/settings');

  return (
    <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Logo — pinned at top */}
      <div className="sidebar-logo" style={{ flexShrink: 0 }}>
        <Target size={24} />
        <span>TargetTrack</span>
      </div>

      {/* Nav — scrollable, fills all space between logo and footer */}
      <nav
        className="sidebar-nav"
        style={{
          flex: '1 1 0',
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingBottom: '8px',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.08) transparent',
        }}
      >
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path + '/'));
          return (
            <div
              key={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <Icon size={18} />
              <span>{item.name}</span>
            </div>
          );
        })}

        {/* ── Settings section — Super Admin only ─────────────────── */}
        {isSuperAdmin && (
          <div style={{ marginTop: '8px' }}>
            <div style={{
              fontSize: '10px',
              fontWeight: 700,
              color: 'var(--text-muted)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '10px 16px 4px',
            }}>
              Administration
            </div>

            <div
              className={`nav-item ${isSettingsActive ? 'active' : ''}`}
              onClick={() => setSettingsOpen((o) => !o)}
              style={{ justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Settings size={18} />
                <span>Settings</span>
              </div>
              {settingsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>

            {/* Sub-items expand inline — scroll handles overflow */}
            {settingsOpen && (
              <div style={{ marginLeft: '12px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {settingsItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <div
                      key={item.path}
                      className={`nav-item ${isActive ? 'active' : ''}`}
                      onClick={() => navigate(item.path)}
                      style={{ padding: '10px 14px', fontSize: '13px' }}
                    >
                      <Icon size={15} />
                      <span>{item.name}</span>
                    </div>
                  );
                })}

                <div
                  className="nav-item"
                  onClick={() => navigate('/admin/dashboard')}
                  style={{ padding: '10px 14px', fontSize: '13px', color: 'var(--color-rag-amber)', opacity: 0.8 }}
                >
                  <ShieldCheck size={15} />
                  <span>Admin Console ↗</span>
                </div>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Footer — pinned at bottom */}
      <div className="sidebar-footer" style={{ flexShrink: 0 }}>
        <div className="user-profile">
          <div className="user-avatar">
            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="user-info">
            <span className="user-name">{user.name}</span>
            <span className="user-role">{roles.join(', ').replace(/_/g, ' ')}</span>
          </div>
        </div>

        <button className="btn-logout" onClick={() => logout()}>
          <LogOut size={16} />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
};
