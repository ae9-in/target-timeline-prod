import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, RefreshCw } from 'lucide-react';

interface PermissionRow {
  id: string;
  resource: string;
  action: string;
  scope: any;
  role: { name: string };
}



export const AdminRolesPermissions: React.FC = () => {
  const { api } = useAuth();
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        // Reuse the existing permissions endpoint (via admin context)
        const res = await api.get('/admin/roles-permissions');
        setPermissions(res.data || []);
      } catch {
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [api]);

  // Group by role name
  const byRole: Record<string, PermissionRow[]> = {};
  permissions.forEach((p) => {
    const roleName = p.role?.name || 'Unknown';
    if (!byRole[roleName]) byRole[roleName] = [];
    byRole[roleName].push(p);
  });

  const ROLE_COLORS: Record<string, string> = {
    SUPER_ADMIN: '#f59e0b',
    LEADERSHIP: '#3b82f6',
    SALES_MANAGER: '#10b981',
    PRODUCTION_MANAGER: '#8b5cf6',
    HR_MANAGER: '#ec4899',
    PLANNING_ANALYST: '#06b6d4',
    VIEWER: '#6b7280',
  };

  return (
    <main className="main-content" style={{ padding: '32px' }}>
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', flex: 1 }}>
          View-only in v1. Permissions are DB-driven — extend via the database seed or a future UI.
        </p>
        <button id="roles-refresh-btn" className="btn btn-secondary" onClick={() => setLoading(true)}>
          <RefreshCw size={14} />
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading permissions...</div>
      ) : Object.keys(byRole).length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <Shield size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px', display: 'block' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            No permissions found. The roles-permissions endpoint may need to be seeded.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {Object.entries(byRole).map(([roleName, perms]) => {
            const color = ROLE_COLORS[roleName] || '#6b7280';
            return (
              <div key={roleName} className="card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }} />
                  <h3 style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 600 }}>
                    {roleName.replace(/_/g, ' ')}
                  </h3>
                  <span className="badge" style={{ marginLeft: 'auto', background: `${color}20`, color }}>{perms.length} permission{perms.length !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {['Resource', 'Action', 'Scope'].map((h) => (
                          <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {perms.map((perm) => (
                        <tr key={perm.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px 20px', fontSize: '13px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                            {perm.resource === '*' ? <span style={{ color: color }}>* (all)</span> : perm.resource}
                          </td>
                          <td style={{ padding: '10px 20px' }}>
                            <span style={{ fontSize: '12px', background: `${color}15`, color, padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 600 }}>
                              {perm.action}
                            </span>
                          </td>
                          <td style={{ padding: '10px 20px', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            {perm.scope ? JSON.stringify(perm.scope) : <span style={{ opacity: 0.4 }}>—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
};
