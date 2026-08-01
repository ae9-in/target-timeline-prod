import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FileText, Plus, Download, Clock } from 'lucide-react';

export const WeeklyReports: React.FC = () => {
  const { api } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'analysis'>('history');

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports/weekly');
      setReports(res.data);
    } catch (err) {
      console.error('Error fetching weekly reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      await api.post('/reports/weekly/generate');
      fetchReports();
    } catch (err) {
      console.error('Error generating report', err);
      alert('Failed to generate report. Make sure Puppeteer and Chrome are configured on the server.');
    } finally {
      setGenerating(false);
    }
  };

  const downloadPdf = async (id: string) => {
    try {
      const res = await api.get(`/reports/weekly/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `weekly_report_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading PDF report', err);
      alert('Error downloading report PDF.');
    }
  };

  const comparisonData = [
    {
      feature: 'User Role Management',
      current: 'Viewer permissions are unclear (Viewer can access Department module)',
      standard: 'Strict Role-Based Access Control (RBAC) with Admin, Manager, Viewer permissions',
      recommendation: 'Restrict viewer access based on assigned roles.',
      tag: 'Security'
    },
    {
      feature: 'Data Validation',
      current: 'Code field accepts 4 characters though specification says 3',
      standard: 'Strong input validation with mandatory format checks',
      recommendation: 'Implement frontend and backend validation.',
      tag: 'Validation'
    },
    {
      feature: 'Export Function',
      current: 'Export functionality not working',
      standard: 'Export to Excel/PDF/CSV available in most systems',
      recommendation: 'Fix export module and provide multiple export formats.',
      tag: 'Features'
    },
    {
      feature: 'Dropdown Selection',
      current: 'Location dropdown cannot be selected after updating',
      standard: 'Auto-refresh and dynamic dropdown loading',
      recommendation: 'Refresh dropdown after update without page reload.',
      tag: 'Usability'
    },
    {
      feature: 'Dashboard Metrics',
      current: 'Baseline value does not update correctly',
      standard: 'Real-time dashboard calculations',
      recommendation: 'Refresh KPIs immediately after data changes.',
      tag: 'Accuracy'
    },
    {
      feature: 'Alert Management',
      current: 'Resolved targets still appear in Alerts and Risk Log',
      standard: 'Alerts automatically disappear after resolution',
      recommendation: 'Synchronize alert status with task status.',
      tag: 'Alerts'
    },
    {
      feature: 'User Experience',
      current: 'Some modules require multiple refreshes',
      standard: 'Smooth navigation with instant UI updates',
      recommendation: 'Improve frontend state management and responsiveness.',
      tag: 'UX/UI'
    },
    {
      feature: 'Error Handling',
      current: 'Limited validation and user feedback',
      standard: 'Clear error messages and success notifications',
      recommendation: 'Display meaningful validation and confirmation messages.',
      tag: 'UX/UI'
    },
    {
      feature: 'Search & Filters',
      current: 'Basic filtering',
      standard: 'Advanced filters, global search, sorting, saved filters',
      recommendation: 'Add multi-filter and search functionality.',
      tag: 'UX/UI'
    },
    {
      feature: 'Audit Trail',
      current: 'Limited visibility',
      standard: 'Complete activity history and change logs',
      recommendation: 'Maintain logs for updates, deletions, and user actions.',
      tag: 'Security'
    },
    {
      feature: 'Performance',
      current: 'Minor UI delays during updates',
      standard: 'Optimized loading with caching and lazy loading',
      recommendation: 'Optimize API response time and frontend rendering.',
      tag: 'Performance'
    }
  ];

  const getTagBadge = (tag: string) => {
    switch (tag) {
      case 'Security':
        return <span className="badge red" style={{ fontSize: '10px', padding: '2px 8px', textTransform: 'capitalize' }}>{tag}</span>;
      case 'Validation':
      case 'Accuracy':
        return <span className="badge amber" style={{ fontSize: '10px', padding: '2px 8px', textTransform: 'capitalize' }}>{tag}</span>;
      case 'Alerts':
      case 'Features':
        return <span className="badge green" style={{ fontSize: '10px', padding: '2px 8px', textTransform: 'capitalize' }}>{tag}</span>;
      default:
        return (
          <span 
            className="badge" 
            style={{ 
              fontSize: '10px', 
              padding: '2px 8px', 
              textTransform: 'capitalize', 
              backgroundColor: 'rgba(255,255,255,0.06)', 
              border: '1px solid rgba(255,255,255,0.1)', 
              color: 'var(--text-secondary)' 
            }}
          >
            {tag}
          </span>
        );
    }
  };

  return (
    <div className="content-container">
      {/* Header Panel with Tabs */}
      <div className="glass-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="flex justify-between items-center" style={{ width: '100%' }}>
          <div className="flex items-center gap-16">
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>System Reports & Gap Analysis</h2>
          </div>

          {activeTab === 'history' && (
            <button 
              className="btn btn-primary" 
              disabled={generating} 
              onClick={handleGenerate}
            >
              <Plus size={16} />
              <span>{generating ? 'Generating PDF...' : 'Generate Report Now'}</span>
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', width: '100%' }}>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              background: activeTab === 'history' ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'history' ? '2px solid var(--color-primary)' : '2px solid transparent',
              color: activeTab === 'history' ? 'var(--color-primary)' : 'var(--text-secondary)',
              padding: '10px 20px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              borderRadius: 'var(--border-radius-sm) var(--border-radius-sm) 0 0',
              transition: 'var(--transition-smooth)'
            }}
          >
            Report History
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            style={{
              background: activeTab === 'analysis' ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'analysis' ? '2px solid var(--color-primary)' : '2px solid transparent',
              color: activeTab === 'analysis' ? 'var(--color-primary)' : 'var(--text-secondary)',
              padding: '10px 20px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              borderRadius: 'var(--border-radius-sm) var(--border-radius-sm) 0 0',
              transition: 'var(--transition-smooth)'
            }}
          >
            System Gap Analysis
          </button>
        </div>
      </div>

      {activeTab === 'history' ? (
        /* Reports list tab */
        <div className="table-container">
          {loading ? (
            <div className="text-center" style={{ padding: '40px', color: 'var(--text-muted)' }}>Loading reports list...</div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Report ID</th>
                  <th>Generated At</th>
                  <th>Green Share</th>
                  <th>Amber Share</th>
                  <th>Red Share</th>
                  <th style={{ width: '150px' }}>Download</th>
                </tr>
              </thead>
              <tbody>
                {reports.length > 0 ? (
                  reports.map((r) => {
                    const summary = r.summary || { GREEN: 0, AMBER: 0, RED: 0 };
                    return (
                      <tr key={r.id}>
                        <td>
                          <div className="flex items-center gap-8">
                            <FileText size={16} style={{ color: 'var(--color-primary)' }} />
                            <strong>{r.id}</strong>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-8" style={{ color: 'var(--text-secondary)' }}>
                            <Clock size={14} />
                            <span>{new Date(r.generatedAt).toLocaleString()}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--color-rag-green)', fontWeight: 600 }}>{summary.GREEN} targets</td>
                        <td style={{ color: 'var(--color-rag-amber)', fontWeight: 600 }}>{summary.AMBER} targets</td>
                        <td style={{ color: 'var(--color-rag-red)', fontWeight: 600 }}>{summary.RED} targets</td>
                        <td>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => downloadPdf(r.id)}
                          >
                            <Download size={14} />
                            <span>PDF</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center" style={{ color: 'var(--text-muted)', padding: '40px' }}>
                      No reports generated yet. Click "Generate Report Now" to trigger a new run.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        /* Gap Analysis comparative table tab */
        <div className="table-container glass-card" style={{ padding: 0 }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '200px' }}>Feature</th>
                <th style={{ width: '30%' }}>Target Timeline (Current)</th>
                <th style={{ width: '30%' }}>Standard ERP/CRM Systems</th>
                <th>Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.map((item, index) => (
                <tr key={index}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.feature}</span>
                      <div style={{ display: 'flex' }}>{getTagBadge(item.tag)}</div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5' }}>
                    {item.current}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5' }}>
                    {item.standard}
                  </td>
                  <td style={{ color: '#a5b4fc', fontWeight: 600, fontSize: '13px', lineHeight: '1.5' }}>
                    {item.recommendation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
