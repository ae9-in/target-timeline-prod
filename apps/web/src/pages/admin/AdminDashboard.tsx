import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Users, ShieldCheck, Clock, TrendingUp, ExternalLink, Activity } from 'lucide-react';

interface UserStats {
  total: number;
  byStatus: Record<string, number>;
  byRole: Record<string, number>;
}

interface AuditEntry {
  id: string;
  action: string;
  actorId: string | null;
  resourceType: string;
  resourceId: string | null;
  ip: string | null;
  createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN: '#10b981',
  ADMIN_LOGIN_ATTEMPT: '#f59e0b',
  LOGOUT: '#6b7280',
  USER_INVITED: '#3b82f6',
  USER_DISABLED: '#ef4444',
  USER_ENABLED: '#10b981',
  USER_ROLE_CHANGED: '#8b5cf6',
  USER_PASSWORD_RESET_FORCED: '#f59e0b',
  USER_SESSIONS_REVOKED: '#ef4444',
  TOKEN_REUSE_ATTEMPT: '#ef4444',
  LOGIN_FAILURE: '#ef4444',
};

export const AdminDashboard: React.FC = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditEntry[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/users');
        const users: any[] = res.data;
        const byStatus: Record<string, number> = {};
        const byRole: Record<string, number> = {};

        users.forEach((u) => {
          byStatus[u.status] = (byStatus[u.status] || 0) + 1;
          (u.roles || []).forEach((r: any) => {
            const roleName = r.name || r;
            byRole[roleName] = (byRole[roleName] || 0) + 1;
          });
        });

        setStats({ total: users.length, byStatus, byRole });
      } catch (err) {
        console.error('Failed to load user stats', err);
      } finally {
        setLoadingStats(false);
      }
    };

    const fetchLogs = async () => {
      try {
        const res = await api.get('/audit-log?limit=10');
        setRecentLogs(res.data?.data || []);
      } catch (err) {
        console.error('Failed to load audit logs', err);
      } finally {
        setLoadingLogs(false);
      }
    };

    fetchStats();
    fetchLogs();
  }, [api]);

  const statCards = [
    {
      label: 'Total Users',
      value: stats?.total ?? '—',
      icon: Users,
      color: '#3b82f6',
      bg: 'rgba(59,130,246,0.1)',
    },
    {
      label: 'Active',
      value: stats?.byStatus?.ACTIVE ?? 0,
      icon: ShieldCheck,
      color: '#10b981',
      bg: 'rgba(16,185,129,0.1)',
    },
    {
      label: 'Invited (Pending)',
      value: stats?.byStatus?.INVITED ?? 0,
      icon: Clock,
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.1)',
    },
    {
      label: 'Disabled',
      value: stats?.byStatus?.DISABLED ?? 0,
      icon: TrendingUp,
      color: '#ef4444',
      bg: 'rgba(239,68,68,0.1)',
    },
  ];

  return (
    <main className="main-content" style={{ padding: '32px' }}>
      {/* Stat cards */}
      <section style={{ marginBottom: '36px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '12px',
                    background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={22} style={{ color: card.color }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {loadingStats ? '—' : card.value}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{card.label}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Role breakdown */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} style={{ color: 'var(--admin-accent, #f59e0b)' }} />
            Users by Role
          </h3>
          {loadingStats ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>Loading...</div>
          ) : stats?.byRole && Object.keys(stats.byRole).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(stats.byRole).map(([role, count]) => (
                <div key={role} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {role.replace(/_/g, ' ')}
                  </span>
                  <span className="badge blue" style={{ fontSize: '12px' }}>{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No data</div>
          )}

          <button
            id="admin-dash-manage-users-btn"
            className="btn btn-secondary"
            style={{ marginTop: '20px', width: '100%', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
            onClick={() => navigate('/admin/users')}
          >
            <Users size={14} />
            Manage Users
          </button>
        </div>

        {/* Recent audit log */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} style={{ color: 'var(--admin-accent, #f59e0b)' }} />
            Recent Audit Activity
          </h3>
          {loadingLogs ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>Loading...</div>
          ) : recentLogs.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recentLogs.slice(0, 8).map((log) => {
                const color = ACTION_COLORS[log.action] || '#6b7280';
                return (
                  <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1, fontFamily: 'monospace' }}>
                      {log.action}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No activity yet</div>
          )}

          <button
            id="admin-dash-view-audit-btn"
            className="btn btn-secondary"
            style={{ marginTop: '20px', width: '100%', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
            onClick={() => navigate('/admin/audit-log')}
          >
            <ExternalLink size={14} />
            View Full Audit Log
          </button>
        </div>
      </div>
    </main>
  );
};
