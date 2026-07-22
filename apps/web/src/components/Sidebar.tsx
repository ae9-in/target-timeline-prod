import React from 'react';
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
  Building2
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;

  const roles = user.roles || [];
  const isSuperAdmin = roles.includes('SUPER_ADMIN');
  const isLeadership = roles.includes('LEADERSHIP');
  const showAnalytics = isSuperAdmin || isLeadership;
  const showReports = isSuperAdmin || isLeadership;

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Target Tracker', path: '/targets', icon: Target },
    { name: 'Gantt Timeline', path: '/timeline', icon: Clock },
    { name: 'Calendar', path: '/calendar', icon: Calendar },
    { name: 'Departments', path: '/departments', icon: Building2 },
    { name: 'Department Performance', path: '/performance', icon: Users },
    ...(showAnalytics ? [{ name: 'Analytics', path: '/analytics', icon: BarChart3 }] : []),
    { name: 'Alerts & Risks', path: '/alerts', icon: AlertTriangle },
    ...(showReports ? [{ name: 'Weekly Reports', path: '/reports', icon: FileText }] : []),
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Target size={24} />
        <span>TargetTrack</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
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
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar">
            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="user-info">
            <span className="user-name">{user.name}</span>
            <span className="user-role">{roles.join(', ').replace('_', ' ')}</span>
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
