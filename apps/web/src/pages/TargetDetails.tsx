import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { ArrowLeft, Clock, User, Briefcase, Activity } from 'lucide-react';

export const TargetDetails: React.FC = () => {
  const { api } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [target, setTarget] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [targetRes, historyRes] = await Promise.all([
          api.get(`/targets/${id}`),
          api.get(`/targets/${id}/history`),
        ]);
        setTarget(targetRes.data);
        setHistory(historyRes.data);

        // Fetch audit logs if permitted
        try {
          const auditRes = await api.get('/audit-log');
          // Filter logs for this target resource
          const filteredLogs = auditRes.data.filter((log: any) => log.resourceId === id);
          setAuditLogs(filteredLogs);
        } catch (auditErr) {
          // Silent catch: user doesn't have permission to read audit log
          setAuditLogs([]);
        }
      } catch (err) {
        console.error('Error fetching target details', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [api, id]);

  if (loading) {
    return <div className="text-center" style={{ padding: '40px' }}>Loading target details...</div>;
  }

  if (!target) {
    return <div className="text-center" style={{ padding: '40px' }}>Target not found or access restricted.</div>;
  }

  // Chart configuration: Trend of snapshots over time
  // If history is empty, show a single point representing current value
  const chartData = history.length > 0 
    ? history.map(h => ({ date: new Date(h.capturedAt).toLocaleDateString(), val: h.currentValue }))
    : [{ date: new Date(target.startDate).toLocaleDateString(), val: target.baseline }, { date: new Date().toLocaleDateString(), val: target.currentValue }];

  const trendOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: chartData.map(d => d.date),
      axisLabel: { color: '#9ca3af' },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#9ca3af' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
    },
    series: [
      {
        data: chartData.map(d => d.val),
        type: 'line',
        smooth: true,
        itemStyle: { color: 'var(--color-primary)' },
        lineStyle: { width: 3 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(99, 102, 241, 0.25)' },
              { offset: 1, color: 'rgba(99, 102, 241, 0)' }
            ]
          }
        }
      }
    ]
  };

  return (
    <div className="content-container">
      {/* Back Header */}
      <div className="flex justify-between items-center">
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          <span>Back to Tracker</span>
        </button>

        <span className={`badge ${target.ragStatus.toLowerCase()}`}>{target.ragStatus} Status</span>
      </div>

      {/* Target Info Panels */}
      <div className="grid-cols-2">
        {/* Core Metadata */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>{target.name}</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-light)', paddingBottom: '10px' }}>
              <Briefcase size={16} style={{ color: 'var(--color-primary)' }} />
              <span style={{ color: 'var(--text-secondary)', width: '100px' }}>Department:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{target.vertical}</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-light)', paddingBottom: '10px' }}>
              <User size={16} style={{ color: 'var(--color-primary)' }} />
              <span style={{ color: 'var(--text-secondary)', width: '100px' }}>Owner:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{target.owner}</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-light)', paddingBottom: '10px' }}>
              <Clock size={16} style={{ color: 'var(--color-primary)' }} />
              <span style={{ color: 'var(--text-secondary)', width: '100px' }}>Start Date:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{new Date(target.startDate).toLocaleDateString()}</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-light)', paddingBottom: '10px' }}>
              <Clock size={16} style={{ color: 'var(--color-primary)' }} />
              <span style={{ color: 'var(--text-secondary)', width: '100px' }}>Deadline:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{new Date(target.deadline).toLocaleDateString()}</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Activity size={16} style={{ color: 'var(--color-primary)' }} />
              <span style={{ color: 'var(--text-secondary)', width: '100px' }}>Pace Deficit:</span>
              <strong style={{ color: target.gap > 0 ? 'var(--color-rag-red)' : 'var(--color-rag-green)' }}>
                {target.gap > 0 ? `${Math.round(target.gap * 100)}% behind expected` : 'On track / Ahead'}
              </strong>
            </div>
          </div>
        </div>

        {/* Current Metrics Card */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--text-secondary)' }}>Current vs Target Values</h3>
          
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', margin: '20px 0' }}>
            <span style={{ fontSize: '48px', fontWeight: '800', color: 'var(--text-primary)' }}>{target.currentValue}</span>
            <span style={{ color: 'var(--text-muted)' }}>/ {target.targetValue} {target.unit}</span>
          </div>

          <div className="pace-container">
            <div className="pace-label-row">
              <span>Baseline: {target.baseline} {target.unit}</span>
              <span>Completion: {Math.round(target.actualProgress * 100)}%</span>
            </div>
            <div className="pace-track" style={{ height: '12px' }}>
              <div 
                className="pace-fill" 
                style={{ 
                  width: `${Math.min(100, Math.max(0, target.actualProgress * 100))}%`,
                  backgroundColor: `var(--color-rag-${target.ragStatus.toLowerCase()})`
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Historical Trend Chart */}
      <div className="glass-card">
        <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: 'bold' }}>Progress Snapshot History</h3>
        <div style={{ height: '300px' }}>
          <ReactECharts option={trendOption} style={{ height: '100%', width: '100%' }} />
        </div>
      </div>

      {/* Target Specific Audit Trail */}
      {auditLogs.length > 0 && (
        <div className="glass-card">
          <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: 'bold' }}>Change Audit History</h3>
          
          <div className="audit-timeline">
            {auditLogs.map((log) => (
              <div key={log.id} className="audit-item">
                <div className="audit-meta">
                  <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>IP: {log.ip}</span>
                  <span>•</span>
                  <span>{new Date(log.createdAt).toLocaleString()}</span>
                </div>
                <div className="audit-desc">
                  Action: <strong style={{ color: 'var(--color-accent)' }}>{log.action}</strong> 
                  {log.action === 'UPDATE' && (
                    <span> 
                      (Changed value from {log.before?.currentValue} to {log.after?.currentValue})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
