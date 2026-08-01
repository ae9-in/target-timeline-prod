import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  ShieldAlert, 
  ShieldX, 
  TrendingUp, 
  Clock, 
  ArrowRight 
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [targets, setTargets] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [targetsRes, alertsRes] = await Promise.all([
          api.get('/targets'),
          api.get('/alerts?status=open'),
        ]);
        setTargets(targetsRes.data);
        setAlerts(alertsRes.data);
      } catch (err) {
        console.error('Error fetching dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [api]);

  if (loading) {
    return <div className="text-center" style={{ padding: '40px' }}>Loading Dashboard...</div>;
  }

  // Calculate RAG counts
  const ragCounts = targets.reduce(
    (acc, t) => {
      const status = t.ragStatus?.toUpperCase();
      if (status === 'GREEN') acc.GREEN++;
      else if (status === 'AMBER') acc.AMBER++;
      else if (status === 'RED') acc.RED++;
      return acc;
    },
    { GREEN: 0, AMBER: 0, RED: 0 }
  );

  // Get nearest 5 deadlines
  const upcomingDeadlines = [...targets]
    .filter(t => new Date(t.deadline) > new Date())
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 5);

  // Get top 5 urgent alerts
  const urgentAlerts = alerts.slice(0, 5);

  return (
    <div className="content-container">
      {/* Summary Grid */}
      <div className="summary-grid">
        <div className="glass-card summary-card" style={{ borderLeft: '4px solid var(--color-rag-green)' }}>
          <div className="summary-icon" style={{ backgroundColor: 'var(--color-rag-green-bg)', color: 'var(--color-rag-green)' }}>
            <ShieldCheck size={24} />
          </div>
          <div className="summary-details">
            <span className="summary-label">On Track (Green)</span>
            <span className="summary-value" style={{ color: 'var(--color-rag-green)' }}>{ragCounts.GREEN}</span>
          </div>
        </div>

        <div className="glass-card summary-card" style={{ borderLeft: '4px solid var(--color-rag-amber)' }}>
          <div className="summary-icon" style={{ backgroundColor: 'var(--color-rag-amber-bg)', color: 'var(--color-rag-amber)' }}>
            <ShieldAlert size={24} />
          </div>
          <div className="summary-details">
            <span className="summary-label">At Risk (Amber)</span>
            <span className="summary-value" style={{ color: 'var(--color-rag-amber)' }}>{ragCounts.AMBER}</span>
          </div>
        </div>

        <div className="glass-card summary-card" style={{ borderLeft: '4px solid var(--color-rag-red)' }}>
          <div className="summary-icon" style={{ backgroundColor: 'var(--color-rag-red-bg)', color: 'var(--color-rag-red)' }}>
            <ShieldX size={24} />
          </div>
          <div className="summary-details">
            <span className="summary-label">Off Track (Red)</span>
            <span className="summary-value" style={{ color: 'var(--color-rag-red)' }}>{ragCounts.RED}</span>
          </div>
        </div>

        <div className="glass-card summary-card">
          <div className="summary-icon" style={{ backgroundColor: 'var(--color-primary-glow)', color: 'var(--color-primary)' }}>
            <TrendingUp size={24} />
          </div>
          <div className="summary-details">
            <span className="summary-label">Total Targets</span>
            <span className="summary-value">{targets.length}</span>
          </div>
        </div>
      </div>

      <div className="grid-cols-2">
        {/* Urgent Alerts Section */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="flex justify-between items-center">
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Urgent Status Alerts</h3>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={() => navigate('/alerts')}
            >
              <span>View All</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Target</th>
                  <th>Vertical</th>
                  <th>Gap</th>
                  <th>RAG</th>
                </tr>
              </thead>
              <tbody>
                {urgentAlerts.length > 0 ? (
                  urgentAlerts.map((alert) => (
                    <tr key={alert.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/targets/${alert.targetId}`)}>
                      <td><strong>{alert.target?.name}</strong></td>
                      <td>{alert.target?.vertical}</td>
                      <td>{alert.gapPoints}% behind</td>
                      <td>
                        <span className={`badge ${alert.ragStatus.toLowerCase()}`}>{alert.ragStatus}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center" style={{ color: 'var(--text-muted)' }}>
                      No active alerts. Excellent performance!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upcoming Deadlines Section */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="flex justify-between items-center">
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Upcoming Deadlines</h3>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={() => navigate('/targets')}
            >
              <span>Tracker</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Target</th>
                  <th>Deadline</th>
                  <th>RAG Status</th>
                </tr>
              </thead>
              <tbody>
                {upcomingDeadlines.length > 0 ? (
                  upcomingDeadlines.map((t) => (
                    <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/targets/${t.id}`)}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong>{t.name}</strong>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.vertical} • Owner: {t.owner}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-8" style={{ color: 'var(--text-secondary)' }}>
                          <Clock size={14} />
                          <span>{new Date(t.deadline).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${t.ragStatus.toLowerCase()}`}>{t.ragStatus}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="text-center" style={{ color: 'var(--text-muted)' }}>
                      No upcoming deadlines.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
