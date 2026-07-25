import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { RefreshCw, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

const ACTION_COLORS: Record<string, string> = {
  LOGIN: '#10b981',
  ADMIN_LOGIN_ATTEMPT: '#f59e0b',
  LOGOUT: '#6b7280',
  LOGIN_FAILURE: '#ef4444',
  USER_INVITED: '#3b82f6',
  USER_INVITE_ACCEPTED: '#10b981',
  USER_INVITE_RESENT: '#6b7280',
  USER_DISABLED: '#ef4444',
  USER_ENABLED: '#10b981',
  USER_ROLE_CHANGED: '#8b5cf6',
  USER_VERTICAL_SCOPE_CHANGED: '#8b5cf6',
  USER_PASSWORD_RESET_FORCED: '#f59e0b',
  USER_SESSIONS_REVOKED: '#ef4444',
  PASSWORD_CHANGED: '#3b82f6',
  PASSWORD_RESET_REQUEST: '#6b7280',
  PASSWORD_RESET_CONFIRM: '#10b981',
  TOKEN_REUSE_ATTEMPT: '#ef4444',
  CREATE_USER: '#3b82f6',
  UPDATE_USER_ROLES: '#8b5cf6',
};

interface AuditEntry {
  id: string;
  action: string;
  actorId: string | null;
  resourceType: string;
  resourceId: string | null;
  before: any;
  after: any;
  ip: string | null;
  createdAt: string;
}

interface Meta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ALL_ACTIONS = Object.keys(ACTION_COLORS);

export const AdminAuditLog: React.FC = () => {
  const { api } = useAuth();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [meta, setMeta] = useState<Meta>({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (filterAction) params.set('action', filterAction);
      if (filterFrom) params.set('from', filterFrom);
      if (filterTo) params.set('to', filterTo);
      const res = await api.get(`/audit-log?${params}`);
      setLogs(res.data?.data || []);
      setMeta(res.data?.meta || { page: 1, limit: 50, total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  }, [api, page, filterAction, filterFrom, filterTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleFilter = () => { setPage(1); fetchLogs(); };

  return (
    <main className="main-content" style={{ padding: '32px' }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px', alignItems: 'flex-end' }}>
        <div>
          <label className="form-label" style={{ fontSize: '11px' }}>Action</label>
          <select
            id="audit-filter-action"
            className="form-input"
            style={{ width: '220px' }}
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
          >
            <option value="">All actions</option>
            {ALL_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label" style={{ fontSize: '11px' }}>From</label>
          <input id="audit-filter-from" type="date" className="form-input" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
        </div>
        <div>
          <label className="form-label" style={{ fontSize: '11px' }}>To</label>
          <input id="audit-filter-to" type="date" className="form-input" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
        </div>
        <button id="audit-apply-filter-btn" className="btn btn-admin" onClick={handleFilter} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Filter size={14} /> Apply
        </button>
        <button id="audit-refresh-btn" className="btn btn-secondary" onClick={fetchLogs}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Summary */}
      <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
        {loading ? 'Loading...' : `${meta.total} entries found`}
      </div>

      {/* Log table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Time', 'Action', 'Actor ID', 'Resource', 'IP', 'Details'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No audit entries found</td></tr>
              ) : logs.map((log) => {
                const color = ACTION_COLORS[log.action] || '#6b7280';
                const isExpanded = expandedId === log.id;

                return (
                  <React.Fragment key={log.id}>
                    <tr
                      style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    >
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          fontSize: '12px', fontWeight: 600, color,
                          background: `${color}15`, padding: '3px 8px', borderRadius: '6px', fontFamily: 'monospace',
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {log.actorId ? log.actorId.slice(0, 8) + '...' : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {log.resourceType}
                        {log.resourceId && <span style={{ color: 'var(--text-muted)', marginLeft: '4px', fontFamily: 'monospace' }}>:{log.resourceId.slice(0, 6)}</span>}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {log.ip || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '11px', color: 'var(--accent)', cursor: 'pointer' }}>
                        {isExpanded ? '▲ Hide' : '▼ Show'}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                        <td colSpan={6} style={{ padding: '16px 16px 16px 32px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            {log.before && (
                              <div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>BEFORE</div>
                                <pre style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--surface-2)', padding: '10px', borderRadius: '6px', overflow: 'auto', margin: 0 }}>
                                  {JSON.stringify(log.before, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.after && (
                              <div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>AFTER</div>
                                <pre style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--surface-2)', padding: '10px', borderRadius: '6px', overflow: 'auto', margin: 0 }}>
                                  {JSON.stringify(log.after, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div style={{ padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', borderTop: '1px solid var(--border)' }}>
            <button
              id="audit-prev-page-btn"
              className="btn btn-secondary"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{ padding: '6px 10px' }}
            >
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Page {meta.page} of {meta.totalPages}
            </span>
            <button
              id="audit-next-page-btn"
              className="btn btn-secondary"
              disabled={page === meta.totalPages}
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              style={{ padding: '6px 10px' }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </main>
  );
};
