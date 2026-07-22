import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FileText, Plus, Download, Clock } from 'lucide-react';

export const WeeklyReports: React.FC = () => {
  const { api } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

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

  return (
    <div className="content-container">
      {/* Reports Actions Header */}
      <div className="flex justify-between items-center glass-card" style={{ padding: '16px 24px' }}>
        <div className="flex items-center gap-16">
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Formal RAG Summaries History</h2>
        </div>

        <button 
          className="btn btn-primary" 
          disabled={generating} 
          onClick={handleGenerate}
        >
          <Plus size={16} />
          <span>{generating ? 'Generating PDF...' : 'Generate Report Now'}</span>
        </button>
      </div>

      {/* Reports list */}
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
    </div>
  );
};
