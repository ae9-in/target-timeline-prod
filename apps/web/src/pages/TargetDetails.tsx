import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { ArrowLeft, Clock, User, Briefcase, Activity, Edit3, X, Sliders } from 'lucide-react';

export const TargetDetails: React.FC = () => {
  const { api } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [target, setTarget] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Update Modal State
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [formCurrentValue, setFormCurrentValue] = useState<number>(0);
  const [formStartDate, setFormStartDate] = useState<string>('');
  const [formDeadline, setFormDeadline] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [targetRes, historyRes] = await Promise.all([
        api.get(`/targets/${id}`),
        api.get(`/targets/${id}/history`),
      ]);
      setTarget(targetRes.data);
      setHistory(historyRes.data);

      try {
        const auditRes = await api.get('/audit-log');
        const filteredLogs = auditRes.data.filter((log: any) => log.resourceId === id);
        setAuditLogs(filteredLogs);
      } catch (auditErr) {
        setAuditLogs([]);
      }
    } catch (err) {
      console.error('Error fetching target details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [api, id]);

  const openUpdateModal = () => {
    if (!target) return;
    setFormCurrentValue(target.currentValue ?? 0);
    setFormStartDate(new Date(target.startDate).toISOString().split('T')[0]);
    setFormDeadline(new Date(target.deadline).toISOString().split('T')[0]);
    setFormError('');
    setIsUpdateModalOpen(true);
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);

    try {
      const payload = {
        currentValue: Number(formCurrentValue),
        startDate: new Date(formStartDate).toISOString(),
        deadline: new Date(formDeadline).toISOString(),
        progressPct: target.targetValue > 0 ? (Number(formCurrentValue) / target.targetValue) * 100 : 0
      };

      await api.put(`/targets/${id}`, payload);
      await fetchData();
      setIsUpdateModalOpen(false);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      const formatted = Array.isArray(msg) ? msg.join('; ') : (msg || err.message || 'Failed to update target');
      setFormError(formatted);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center" style={{ padding: '40px' }}>Loading target details...</div>;
  }

  if (!target) {
    return <div className="text-center" style={{ padding: '40px' }}>Target not found or access restricted.</div>;
  }

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

  const calculatedPct = target.targetValue > 0 ? Math.min(100, Math.max(0, Math.round((formCurrentValue / target.targetValue) * 100))) : 0;

  return (
    <div className="content-container">
      {/* Back Header & Actions */}
      <div className="flex justify-between items-center" style={{ gap: '16px', flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          <span>Back to Tracker</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={openUpdateModal}
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              padding: '8px 16px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Edit3 size={16} />
            <span>Update Progress & Timeline</span>
          </button>

          <span className={`badge ${target.ragStatus.toLowerCase()}`}>{target.ragStatus} Status</span>
        </div>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--text-secondary)' }}>Current vs Target Values</h3>
            <button
              type="button"
              onClick={openUpdateModal}
              style={{
                background: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#60a5fa',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Sliders size={13} />
              <span>Adjust Progress</span>
            </button>
          </div>
          
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

      {/* Interactive Update Progress & Timeline Modal */}
      {isUpdateModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setIsUpdateModalOpen(false)}
        >
          <div
            style={{
              background: '#141520',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sliders size={20} style={{ color: '#60a5fa' }} />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
                  Update Progress & Timeline
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUpdateModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUpdateSubmit} style={{ padding: '24px' }}>
              {formError && (
                <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#f87171', fontSize: '13px', marginBottom: '16px' }}>
                  {formError}
                </div>
              )}

              {/* Target Name Header */}
              <div style={{ marginBottom: '20px', background: 'rgba(255,255,255,0.03)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Target Name</span>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>{target.name}</div>
              </div>

              {/* Current Progress Value & Slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Current Completed Value ({target.unit})
                  </label>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#60a5fa' }}>
                    {calculatedPct}% Completed
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                  <input
                    type="number"
                    required
                    min={0}
                    step="any"
                    value={formCurrentValue}
                    onChange={(e) => setFormCurrentValue(Number(e.target.value))}
                    style={{
                      width: '120px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: '#0d0e15',
                      color: '#ffffff',
                      fontSize: '16px',
                      fontWeight: 700,
                      outline: 'none'
                    }}
                  />
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>/ {target.targetValue} {target.unit}</span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={target.targetValue || 100}
                  step={1}
                  value={formCurrentValue}
                  onChange={(e) => setFormCurrentValue(Number(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: '#3b82f6',
                    cursor: 'pointer'
                  }}
                />
              </div>

              {/* Start Date & Deadline Adjustments */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: '#0d0e15',
                      color: '#ffffff',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Deadline
                  </label>
                  <input
                    type="date"
                    required
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: '#0d0e15',
                      color: '#ffffff',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsUpdateModalOpen(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                    opacity: saving ? 0.7 : 1
                  }}
                >
                  {saving ? 'Saving Progress...' : 'Save & Update Progress'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
