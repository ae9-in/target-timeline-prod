import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, Eye } from 'lucide-react';

export const Alerts: React.FC = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('open'); // 'all', 'open', 'resolved'

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/alerts?status=${statusFilter === 'all' ? '' : statusFilter}`);
      setAlerts(res.data);
    } catch (err) {
      console.error('Error fetching alerts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [statusFilter]);

  const handleAcknowledge = async (id: string) => {
    try {
      await api.patch(`/alerts/${id}/acknowledge`);
      fetchAlerts();
    } catch (err: any) {
      console.error('Error acknowledging alert', err);
      alert(err.response?.data?.message || 'Failed to acknowledge alert. Please try again.');
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await api.patch(`/alerts/${id}/resolve`);
      fetchAlerts();
    } catch (err: any) {
      console.error('Error resolving alert', err);
      alert(err.response?.data?.message || 'Failed to resolve alert. Please try again.');
    }
  };

  return (
    <div className="content-container">
      {/* Filters Header */}
      <div className="flex justify-between items-center glass-card" style={{ padding: '16px 24px' }}>
        <div className="flex items-center gap-16">
          <div className="flex items-center gap-8">
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Filter Status:</span>
            <select 
              className="form-select" 
              style={{ width: '150px', padding: '6px 12px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Alerts</option>
              <option value="open">Open Alerts</option>
              <option value="resolved">Resolved Alerts</option>
            </select>
          </div>
        </div>

        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          {alerts.length} alerts matching filters
        </div>
      </div>

      {/* Alerts Table */}
      <div className="table-container">
        {loading ? (
          <div className="text-center" style={{ padding: '40px', color: 'var(--text-muted)' }}>Loading alerts...</div>
        ) : (
          <table className="custom-table">
            <thead>
              <tr>
                <th>Alert Target</th>
                <th>Vertical</th>
                <th>RAG State</th>
                <th>Pace Deficit</th>
                <th>Raised Date</th>
                <th>Auditing</th>
                <th style={{ width: '220px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {alerts.length > 0 ? (
                alerts.map((alert) => {
                  const isResolved = alert.resolvedAt !== null;
                  const isAcked = alert.acknowledgedAt !== null;

                  return (
                    <tr key={alert.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong style={{ color: 'var(--text-primary)' }}>{alert.target?.name}</strong>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Owner: {alert.target?.owner}
                          </span>
                        </div>
                      </td>
                      <td>{alert.target?.vertical}</td>
                      <td>
                        <span className={`badge ${alert.ragStatus.toLowerCase()}`}>{alert.ragStatus}</span>
                      </td>
                      <td style={{ color: 'var(--color-rag-red)', fontWeight: 600 }}>
                        {alert.gapPoints}% behind
                      </td>
                      <td>
                        <div className="flex items-center gap-8" style={{ color: 'var(--text-secondary)' }}>
                          <Clock size={14} />
                          <span>{new Date(alert.raisedAt).toLocaleString()}</span>
                        </div>
                      </td>
                      <td>
                        {isResolved ? (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Resolved
                          </span>
                        ) : isAcked ? (
                          <span style={{ fontSize: '12px', color: 'var(--color-accent)' }}>
                            Acked by {alert.acknowledgedBy}
                          </span>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--color-rag-red)' }}>
                            Unacknowledged
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-8">
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            title="View Target Details"
                            onClick={() => navigate(`/targets/${alert.targetId}`)}
                          >
                            <Eye size={14} />
                            <span>Details</span>
                          </button>

                          {!isAcked && !isResolved && (
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '6px 12px', fontSize: '12px', borderColor: 'var(--color-accent-glow)', color: 'var(--color-accent)' }}
                              onClick={() => handleAcknowledge(alert.id)}
                            >
                              <span>Acknowledge</span>
                            </button>
                          )}

                          {!isResolved && (
                            <button 
                              className="btn btn-primary" 
                              style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: 'var(--color-rag-green)', borderColor: 'var(--color-rag-green)' }}
                              onClick={() => handleResolve(alert.id)}
                            >
                              <CheckCircle size={14} />
                              <span>Resolve</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center" style={{ color: 'var(--text-muted)', padding: '40px' }}>
                    No alerts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
