import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  UserPlus, Search, RefreshCw, MoreVertical, Shield, Clock,
  CheckCircle, XCircle, Send, Lock, ToggleLeft, ToggleRight,
  UserCheck, AlertCircle, Link as LinkIcon,
} from 'lucide-react';

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'LEADERSHIP', 'SALES_MANAGER', 'PRODUCTION_MANAGER', 'HR_MANAGER', 'PLANNING_ANALYST', 'VIEWER'];
const VERTICALS = ['Sales', 'Production', 'HR', 'Planning'];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.FC<any> }> = {
  ACTIVE: { label: 'Active', color: '#10b981', icon: CheckCircle },
  INVITED: { label: 'Invited', color: '#f59e0b', icon: Clock },
  DISABLED: { label: 'Disabled', color: '#ef4444', icon: XCircle },
  PENDING_APPROVAL: { label: 'Pending', color: '#6366f1', icon: Clock },
};

interface UserRow {
  id: string;
  name: string;
  email: string;
  roles: Array<{ name: string }>;
  verticalScope: string[];
  status: string;
  lastLoginAt: string | null;
  invitedAt: string | null;
  mustChangePassword: boolean;
}

interface InviteForm {
  email: string;
  name: string;
  role: string;
  verticalScope: string[];
}

const SCOPED_ROLES = ['SALES_MANAGER', 'PRODUCTION_MANAGER', 'HR_MANAGER', 'PLANNING_ANALYST'];

export const AdminUsers: React.FC = () => {
  const { api } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'pending'>('users');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [pendingSignups, setPendingSignups] = useState<UserRow[]>([]);
  const [pendingResets, setPendingResets] = useState<Array<{ userId: string; email: string; name: string; requestedAt: string; resetLink?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteForm>({ email: '', name: '', role: ROLES[2], verticalScope: [] });
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ link?: string; error?: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [approveRole, setApproveRole] = useState<Record<string, string>>({});

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterRole) params.set('role', filterRole);
      const res = await api.get(`/admin/users?${params}`);
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  }, [api, filterStatus, filterRole]);

  const fetchPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const [signupsRes, resetsRes] = await Promise.all([
        api.get('/admin/users/pending-signups'),
        api.get('/admin/users/pending-resets'),
      ]);
      setPendingSignups(signupsRes.data);
      setPendingResets(resetsRes.data);
    } catch (err) {
      console.error('Failed to fetch pending approvals', err);
    } finally {
      setPendingLoading(false);
    }
  }, [api]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { if (activeTab === 'pending') fetchPending(); }, [activeTab, fetchPending]);

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const handleAction = async (userId: string, action: string) => {
    setActionLoading(`${userId}:${action}`);
    setOpenMenu(null);
    try {
      if (action === 'disable') await api.patch(`/admin/users/${userId}/disable`);
      else if (action === 'enable') await api.patch(`/admin/users/${userId}/enable`);
      else if (action === 'reset-password') await api.post(`/admin/users/${userId}/reset-password`);
      else if (action === 'revoke-sessions') await api.post(`/admin/users/${userId}/revoke-sessions`);
      else if (action === 'resend-invite') await api.post(`/admin/users/${userId}/resend-invite`);
      await fetchUsers();
    } catch (err) {
      console.error(`Action ${action} failed`, err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveSignup = async (userId: string) => {
    setActionLoading(`${userId}:approve-signup`);
    setOpenMenu(null);
    try {
      const user = pendingSignups.find((u) => u.id === userId);
      const role = approveRole[userId] || user?.roles[0]?.name || 'VIEWER';
      await api.post(`/admin/users/${userId}/approve-signup`, { role });
      await Promise.all([fetchPending(), fetchUsers()]);
    } catch (err) {
      console.error('Approve failed', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectSignup = async (userId: string) => {
    setActionLoading(`${userId}:reject-signup`);
    setOpenMenu(null);
    try {
      await api.post(`/admin/users/${userId}/reject-signup`);
      await Promise.all([fetchPending(), fetchUsers()]);
    } catch (err) {
      console.error('Reject failed', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveReset = async (userId: string) => {
    setActionLoading(`${userId}:approve-reset`);
    try {
      const res = await api.post(`/admin/users/${userId}/approve-reset`);
      setPendingResets((prev) => prev.map((r) => r.userId === userId ? { ...r, resetLink: res.data.resetLink } : r));
    } catch (err) {
      console.error('Approve reset failed', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectReset = async (userId: string) => {
    setActionLoading(`${userId}:reject-reset`);
    try {
      await api.post(`/admin/users/${userId}/reject-reset`);
      await fetchPending();
    } catch (err) {
      console.error('Reject reset failed', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setInviteResult(null);
    try {
      const res = await api.post('/admin/users', inviteForm);
      setInviteResult({ link: res.data.inviteLink });
      await fetchUsers();
    } catch (err: any) {
      setInviteResult({ error: err.response?.data?.message || 'Failed to send invite' });
    } finally {
      setInviting(false);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  const showVerticals = SCOPED_ROLES.includes(inviteForm.role);

  const pendingCount = pendingSignups.length + pendingResets.length;

  return (
    <main className="main-content" style={{ padding: '32px' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '0' }}>
        {[
          { key: 'users', label: 'All Users' },
          { key: 'pending', label: `Pending Approvals${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '10px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--color-primary)' : '2px solid transparent',
              color: activeTab === tab.key ? 'var(--color-primary)' : 'var(--text-muted)',
              fontWeight: activeTab === tab.key ? 700 : 500,
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              marginBottom: '-1px',
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {/* ── TAB: All Users ──────────────────────────────────────── */}
      {activeTab === 'users' && (
        <>
          {/* Toolbar */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input
                id="admin-users-search"
                className="form-input"
                placeholder="Search by name or email..."
                style={{ paddingLeft: '36px' }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              id="admin-users-filter-status"
              className="form-input"
              style={{ width: '140px' }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INVITED">Invited</option>
              <option value="DISABLED">Disabled</option>
            </select>

            <select
              id="admin-users-filter-role"
              className="form-input"
              style={{ width: '160px' }}
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="">All roles</option>
              {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
            </select>

            <button id="admin-users-refresh-btn" className="btn btn-secondary" onClick={fetchUsers}>
              <RefreshCw size={14} />
            </button>

            <button
              id="admin-users-invite-btn"
              className="btn btn-admin"
              onClick={() => { setShowInviteModal(true); setInviteResult(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <UserPlus size={15} />
              Invite User
            </button>
          </div>

          {/* Users table */}
          <div className="card" style={{ overflow: 'visible', minHeight: '340px' }}>
            <div style={{ overflowX: 'auto', overflowY: 'visible', minHeight: '300px' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Name / Email', 'Role(s)', 'Vertical Scope', 'Status', 'Last Login', 'Actions'].map((h) => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</td></tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No users found</td></tr>
                  ) : filteredUsers.map((u) => {
                    const statusCfg = STATUS_CONFIG[u.status] || STATUS_CONFIG.DISABLED;
                    const StatusIcon = statusCfg.icon;
                    const isLoading = actionLoading?.startsWith(u.id);
                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', opacity: isLoading ? 0.5 : 1 }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>{u.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.email}</div>
                          {u.mustChangePassword && (
                            <span style={{ fontSize: '10px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '3px' }}>
                              <Lock size={9} /> Must change password
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {u.roles.map((r) => (
                              <span key={r.name} className="badge blue" style={{ fontSize: '11px' }}>
                                {r.name.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {u.verticalScope.length ? u.verticalScope.join(', ') : <span style={{ color: 'var(--text-muted)' }}>All</span>}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: statusCfg.color }}>
                            <StatusIcon size={13} />
                            {statusCfg.label}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {formatDate(u.lastLoginAt)}
                        </td>
                        <td style={{ padding: '14px 16px', position: 'relative' }}>
                          <div style={{ position: 'relative' }}>
                            <button
                              id={`admin-user-menu-${u.id}`}
                              className="btn btn-secondary"
                              style={{ padding: '6px 8px' }}
                              onClick={() => setOpenMenu(openMenu === u.id ? null : u.id)}
                              disabled={isLoading}
                            >
                              <MoreVertical size={14} />
                            </button>
                            {openMenu === u.id && (
                              <div style={{
                                position: 'absolute', right: 0, top: '100%', zIndex: 100,
                                background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
                                borderRadius: '8px', padding: '6px', minWidth: '180px',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                              }}>
                                {u.status === 'PENDING_APPROVAL' && (
                                  <>
                                    <MenuItem icon={CheckCircle} label="Approve Request" onClick={() => handleApproveSignup(u.id)} color="#10b981" />
                                    <MenuItem icon={XCircle} label="Reject Request" onClick={() => handleRejectSignup(u.id)} color="#ef4444" />
                                    <div style={{ height: '1px', background: 'var(--border-light)', margin: '4px 0' }} />
                                  </>
                                )}
                                {u.status === 'INVITED' && (
                                  <MenuItem icon={Send} label="Resend Invite" onClick={() => handleAction(u.id, 'resend-invite')} />
                                )}
                                <MenuItem icon={Lock} label="Force Reset Password" onClick={() => handleAction(u.id, 'reset-password')} />
                                <MenuItem icon={Shield} label="Revoke Sessions" onClick={() => handleAction(u.id, 'revoke-sessions')} />
                                {u.status === 'DISABLED' ? (
                                  <MenuItem icon={ToggleRight} label="Enable User" onClick={() => handleAction(u.id, 'enable')} color="#10b981" />
                                ) : (
                                  <MenuItem icon={ToggleLeft} label="Disable User" onClick={() => handleAction(u.id, 'disable')} color="#ef4444" />
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── TAB: Pending Approvals ──────────────────────────────── */}
      {activeTab === 'pending' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Sign-up requests */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserCheck size={18} color="#6366f1" /> Sign-Up Requests
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>Users who self-registered and are awaiting activation.</p>
              </div>
              <button className="btn btn-secondary" onClick={fetchPending} style={{ padding: '8px 12px' }}>
                <RefreshCw size={13} />
              </button>
            </div>

            {pendingLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
            ) : pendingSignups.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <CheckCircle size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p style={{ margin: 0 }}>No pending sign-up requests</p>
              </div>
            ) : (
              <div className="card" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      {['Name / Email', 'Registered Role', 'Assign Role on Approval', 'Actions'].map((h) => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pendingSignups.map((u) => (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 600, fontSize: '14px' }}>{u.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.email}</div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {u.roles.map((r) => (
                              <span key={r.name} className="badge" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', fontSize: '11px' }}>
                                {r.name.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <select
                            className="form-input"
                            style={{ width: '180px', padding: '7px 10px', fontSize: '13px' }}
                            value={approveRole[u.id] || u.roles[0]?.name || 'VIEWER'}
                            onChange={(e) => setApproveRole((prev) => ({ ...prev, [u.id]: e.target.value }))}
                          >
                            {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              className="btn"
                              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', padding: '7px 14px', fontSize: '13px' }}
                              onClick={() => handleApproveSignup(u.id)}
                              disabled={actionLoading === `${u.id}:approve-signup`}
                            >
                              <CheckCircle size={13} /> Approve
                            </button>
                            <button
                              className="btn"
                              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', padding: '7px 14px', fontSize: '13px' }}
                              onClick={() => handleRejectSignup(u.id)}
                              disabled={actionLoading === `${u.id}:reject-signup`}
                            >
                              <XCircle size={13} /> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Password reset requests */}
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} color="#f59e0b" /> Password Reset Requests
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>Users requesting a password reset — approve to generate the reset link.</p>
            </div>

            {pendingLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
            ) : pendingResets.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <CheckCircle size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p style={{ margin: 0 }}>No pending reset requests</p>
              </div>
            ) : (
              <div className="card" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      {['Name / Email', 'Requested At', 'Reset Link', 'Actions'].map((h) => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pendingResets.map((r) => (
                      <tr key={r.userId} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 600, fontSize: '14px' }}>{r.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.email}</div>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>
                          {new Date(r.requestedAt).toLocaleString()}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {r.resetLink ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#10b981', wordBreak: 'break-all', maxWidth: '280px' }}>{r.resetLink}</span>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '11px' }}
                                onClick={() => navigator.clipboard.writeText(r.resetLink!)}
                              >
                                <LinkIcon size={11} /> Copy
                              </button>
                            </div>
                          ) : <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>— not yet approved</span>}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {!r.resetLink && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                className="btn"
                                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', padding: '7px 14px', fontSize: '13px' }}
                                onClick={() => handleApproveReset(r.userId)}
                                disabled={actionLoading === `${r.userId}:approve-reset`}
                              >
                                <CheckCircle size={13} /> Approve & Generate Link
                              </button>
                              <button
                                className="btn"
                                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', padding: '7px 14px', fontSize: '13px' }}
                                onClick={() => handleRejectReset(r.userId)}
                                disabled={actionLoading === `${r.userId}:reject-reset`}
                              >
                                <XCircle size={13} /> Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div
          className="modal-overlay"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowInviteModal(false); }}
        >
          <div className="card" style={{ width: '480px', maxWidth: '95vw', padding: '32px', borderRadius: '16px' }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus size={18} style={{ color: 'var(--admin-accent, #f59e0b)' }} />
              Invite New User
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              An invite email will be sent with a 48-hour setup link. No password is set until they accept.
            </p>

            {inviteResult?.link && (
              <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', color: '#10b981', fontWeight: 600, marginBottom: '6px' }}>✓ Invite created</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                  {inviteResult.link}
                </div>
              </div>
            )}

            {inviteResult?.error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: '#ef4444' }}>
                {inviteResult.error}
              </div>
            )}

            <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Full Name</label>
                <input id="invite-name" className="form-input" required value={inviteForm.name} onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })} placeholder="Jane Smith" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Email Address</label>
                <input id="invite-email" className="form-input" type="email" required value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="jane@company.com" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Role</label>
                <select id="invite-role" className="form-input" value={inviteForm.role} onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value, verticalScope: [] })}>
                  {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                </select>
              </div>

              {showVerticals && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Vertical Scope</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {VERTICALS.map((v) => {
                      const checked = inviteForm.verticalScope.includes(v);
                      return (
                        <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setInviteForm({
                              ...inviteForm,
                              verticalScope: checked
                                ? inviteForm.verticalScope.filter((x) => x !== v)
                                : [...inviteForm.verticalScope, v],
                            })}
                          />
                          {v}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowInviteModal(false)}>Cancel</button>
                <button id="invite-submit-btn" type="submit" className="btn btn-admin" style={{ flex: 1 }} disabled={inviting}>
                  {inviting ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};


const MenuItem: React.FC<{ icon: React.FC<any>; label: string; onClick: () => void; color?: string }> = ({
  icon: Icon, label, onClick, color,
}) => (
  <div
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px',
      cursor: 'pointer', borderRadius: '6px', fontSize: '13px',
      color: color || 'var(--text-secondary)',
      transition: 'background 0.15s',
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface)')}
    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
  >
    <Icon size={13} />
    <span>{label}</span>
  </div>
);
