import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDepartments } from '../context/DepartmentContext';
import { useLocations } from '../context/LocationContext';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Eye, 
  HelpCircle,
  Download
} from 'lucide-react';

export const MasterTargetTracker: React.FC = () => {
  const { api, user } = useAuth();
  const { departments } = useDepartments();
  const { locations } = useLocations();
  const navigate = useNavigate();
  
  const [targets, setTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterVertical, setFilterVertical] = useState('');
  const [filterOwner, setFilterOwner] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLocation, setFilterLocation] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<any>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formVertical, setFormVertical] = useState(() => departments[0]?.name || '');
  const [formOwner, setFormOwner] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formDeadline, setFormDeadline] = useState('');
  const [formBaseline, setFormBaseline] = useState<number | string>('');
  const [formTargetValue, setFormTargetValue] = useState<number | string>('');
  const [formCurrentValue, setFormCurrentValue] = useState<number | string>('');
  const [formUnit, setFormUnit] = useState('');
  const [formLocationId, setFormLocationId] = useState('');
  const [formError, setFormError] = useState('');
  const [formNote, setFormNote] = useState('');

  const roles = user?.roles || [];
  const isManager = roles.some(r => ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'PRODUCTION_MANAGER', 'HR_MANAGER'].includes(r));
  const isPlanner = roles.includes('PLANNING_ANALYST');
  const canCreate = isManager; // Planning analysts cannot create targets
  const canEdit = isManager || isPlanner;
  const canDelete = roles.includes('SUPER_ADMIN') || roles.includes('ADMIN'); // Super admin and admin can delete
  const isAdminOrSuperAdmin = roles.includes('SUPER_ADMIN') || roles.includes('ADMIN');

  const activeTargets = targets.filter((t) => {
    const progress = Math.min(100, Math.max(0, t.actualProgress * 100));
    return Math.round(progress) < 100;
  });

  const completedTargets = targets.filter((t) => {
    const progress = Math.min(100, Math.max(0, t.actualProgress * 100));
    return Math.round(progress) >= 100;
  });

  const fetchTargets = async () => {
    try {
      setLoading(true);
      let url = `/targets?`;
      if (filterVertical) url += `vertical=${filterVertical}&`;
      if (filterOwner) url += `owner=${filterOwner}&`;
      if (filterStatus) url += `status=${filterStatus}&`;
      if (filterLocation) url += `locationId=${filterLocation}&`;
      
      const res = await api.get(url);
      setTargets(res.data);
    } catch (err) {
      console.error('Error fetching targets', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTargets();
  }, [filterVertical, filterOwner, filterStatus, filterLocation]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      await api.post('/targets', {
        name: formName,
        vertical: formVertical,
        owner: formOwner,
        startDate: formStartDate,
        deadline: formDeadline,
        baseline: Number(formBaseline),
        targetValue: Number(formTargetValue),
        currentValue: Number(formCurrentValue),
        unit: formUnit,
        direction: 'up',
        locationId: formLocationId || null,
      });
      setIsCreateOpen(false);
      resetForm();
      fetchTargets();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setFormError(Array.isArray(msg) ? msg.join('; ') : (msg || 'Error creating target'));
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      const payload: any = {};
      if (isPlanner && !isManager) {
        // Planner can ONLY edit dates and timeline
        payload.name = formName;
        payload.owner = formOwner;
        payload.startDate = formStartDate;
        payload.deadline = formDeadline;
      } else {
        // Managers/Admin can edit everything
        payload.name = formName;
        payload.vertical = formVertical;
        payload.owner = formOwner;
        payload.startDate = formStartDate;
        payload.deadline = formDeadline;
        payload.baseline = Number(formBaseline);
        payload.targetValue = Number(formTargetValue);
        payload.currentValue = Number(formCurrentValue);
        payload.unit = formUnit;
        payload.direction = 'up';
        payload.locationId = formLocationId || null;
      }
      payload.note = formNote;

      await api.put(`/targets/${selectedTarget.id}`, payload);
      setIsEditOpen(false);
      resetForm();
      fetchTargets();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setFormError(Array.isArray(msg) ? msg.join('; ') : (msg || 'Error updating target'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this target? All snapshotted progress data will be removed.')) return;
    try {
      await api.delete(`/targets/${id}`);
      fetchTargets();
    } catch (err) {
      console.error('Error deleting target', err);
    }
  };

  const openEditModal = (t: any) => {
    setSelectedTarget(t);
    setFormName(t.name);
    setFormVertical(t.vertical);
    setFormOwner(t.owner);
    setFormStartDate(new Date(t.startDate).toISOString().split('T')[0]);
    setFormDeadline(new Date(t.deadline).toISOString().split('T')[0]);
    setFormBaseline(t.baseline);
    setFormTargetValue(t.targetValue);
    setFormCurrentValue(t.currentValue);
    setFormUnit(t.unit);
    setFormLocationId(t.locationId || '');
    setFormNote('');
    setIsEditOpen(true);
  };

  const resetForm = () => {
    setFormName('');
    setFormVertical(departments[0]?.name || '');
    setFormOwner('');
    setFormStartDate('');
    setFormDeadline('');
    setFormBaseline('');
    setFormTargetValue('');
    setFormCurrentValue('');
    setFormUnit('');
    setFormLocationId('');
    setFormNote('');
    setFormError('');
  };

  const handleExportCSV = () => {
    const headers = ['Target Name', 'Vertical', 'Owner', 'Start Date', 'Deadline', 'Baseline', 'Target Value', 'Current Value', 'Unit', 'RAG Status', 'Progress%'];
    const rows = targets.map((t) => [
      `"${t.name.replace(/"/g, '""')}"`,
      `"${t.vertical.replace(/"/g, '""')}"`,
      `"${t.owner.replace(/"/g, '""')}"`,
      new Date(t.startDate).toISOString().split('T')[0],
      new Date(t.deadline).toISOString().split('T')[0],
      t.baseline,
      t.targetValue,
      t.currentValue,
      `"${t.unit.replace(/"/g, '""')}"`,
      t.ragStatus,
      Math.round(t.actualProgress * 100),
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `targets_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = async () => {
    try {
      let query = `?`;
      if (filterVertical) query += `vertical=${filterVertical}&`;
      if (filterOwner) query += `owner=${filterOwner}&`;
      if (filterStatus) query += `status=${filterStatus}&`;
      if (filterLocation) query += `locationId=${filterLocation}&`;
      
      const res = await api.get(`/targets/export/pdf${query}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `targets_report_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exporting PDF:', err);
      alert('Failed to export PDF report');
    }
  };

  return (
    <div className="content-container">
      {/* Filters & Actions Header */}
      <div 
        className="glass-card" 
        style={{ 
          padding: '20px 24px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-end', 
          flexWrap: 'wrap', 
          gap: '20px',
          marginBottom: '24px'
        }}
      >
        {/* Left Side: Stacked Filters */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', flex: '1 1 auto' }}>
          {/* Vertical Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>Vertical</label>
            <select 
              className="form-select" 
              style={{ width: '140px', padding: '8px 12px', height: '38px' }}
              value={filterVertical}
              onChange={(e) => setFilterVertical(e.target.value)}
            >
              <option value="">All</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>Status</label>
            <select 
              className="form-select" 
              style={{ width: '140px', padding: '8px 12px', height: '38px' }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All</option>
              <option value="Green">Green</option>
              <option value="Amber">Amber</option>
              <option value="Red">Red</option>
            </select>
          </div>

          {/* Owner Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>Owner</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Filter by owner..." 
              style={{ width: '160px', padding: '8px 12px', height: '38px' }}
              value={filterOwner}
              onChange={(e) => setFilterOwner(e.target.value)}
            />
          </div>

          {/* Location Filter */}
          {locations.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>Location</label>
              <select 
                className="form-select" 
                style={{ width: '140px', padding: '8px 12px', height: '38px' }}
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
              >
                <option value="">All</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right Side: Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', flex: '0 0 auto' }}>
          {/* Export Options */}
          <button 
            className="btn btn-secondary" 
            onClick={handleExportCSV} 
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '10px 14px', height: '38px' }}
            title="Export as Excel CSV"
          >
            <Download size={14} />
            <span>Excel (CSV)</span>
          </button>
          
          <button 
            className="btn btn-secondary" 
            onClick={handleExportPDF} 
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '10px 14px', height: '38px' }}
            title="Export as PDF Report"
          >
            <Download size={14} />
            <span>PDF Report</span>
          </button>

          {canCreate && (
            <button 
              className="btn btn-primary" 
              onClick={() => { resetForm(); setIsCreateOpen(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '10px 16px', height: '38px' }}
            >
              <Plus size={16} />
              <span>Create Target</span>
            </button>
          )}
        </div>
      </div>

      {/* Target Columns Layout */}
      {loading ? (
        <div className="text-center" style={{ padding: '40px', color: 'var(--text-muted)' }}>Loading tracker...</div>
      ) : (
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap', width: '100%' }}>
          {/* Active Targets Column */}
          <div style={{ flex: 1, minWidth: '600px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Active Targets ({activeTargets.length})
              </h3>
            </div>
            
            <div className="table-container" style={{ margin: 0 }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Target Name</th>
                    <th>Vertical</th>
                    <th>Owner</th>
                    <th style={{ width: '220px' }}>Pace / Progress</th>
                    <th>Deadline</th>
                    <th>RAG</th>
                    <th style={{ width: '130px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTargets.length > 0 ? (
                    activeTargets.map((t) => {
                      const expectedPct = Math.min(100, Math.max(0, t.expectedProgress * 100));
                      const actualPct = Math.min(100, Math.max(0, t.actualProgress * 100));
                      
                      return (
                        <tr key={t.id}>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <strong style={{ color: 'var(--text-primary)' }}>{t.name}</strong>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                Base: {t.baseline} • Target: {t.targetValue} {t.unit}
                              </span>
                            </div>
                          </td>
                          <td>{t.vertical}</td>
                          <td>{t.owner}</td>
                          <td>
                            <div className="pace-container">
                              <div className="pace-label-row">
                                <span>Actual: {Math.round(actualPct)}%</span>
                                <span>Expected: {Math.round(expectedPct)}%</span>
                              </div>
                              <div className="pace-track">
                                <div 
                                  className="pace-target-marker" 
                                  style={{ left: `${expectedPct}%` }}
                                />
                                <div 
                                  className={`pace-fill`} 
                                  style={{ 
                                    width: `${actualPct}%`,
                                    backgroundColor: `var(--color-rag-${t.ragStatus.toLowerCase()})` 
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td>{new Date(t.deadline).toLocaleDateString()}</td>
                          <td>
                            <span className={`badge ${t.ragStatus.toLowerCase()}`}>{t.ragStatus}</span>
                          </td>
                          <td>
                            <div className="flex items-center gap-8">
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '6px', minWidth: 'auto' }}
                                title="View Details"
                                onClick={() => navigate(`/targets/${t.id}`)}
                              >
                                <Eye size={14} />
                              </button>

                              {canEdit && (
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ padding: '6px', minWidth: 'auto' }}
                                  title="Edit Target"
                                  onClick={() => openEditModal(t)}
                                >
                                  <Edit2 size={14} />
                                </button>
                              )}

                              {canDelete && (
                                <button 
                                  className="btn btn-danger" 
                                  style={{ padding: '6px', minWidth: 'auto' }}
                                  title="Delete Target"
                                  onClick={() => handleDelete(t.id)}
                                >
                                  <Trash2 size={14} />
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
                        No active targets found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Completed Targets Column — Visible ONLY to Super Admins & Admins */}
          {isAdminOrSuperAdmin && (
            <div style={{ width: '340px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Completed Targets ({completedTargets.length})
                </h3>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
                {completedTargets.length > 0 ? (
                  completedTargets.map((t) => (
                    <div 
                      key={t.id} 
                      className="glass-card" 
                      style={{ 
                        padding: '16px', 
                        borderLeft: '4px solid #10b981', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        background: 'rgba(16, 185, 129, 0.02)',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <strong style={{ fontSize: '14px', color: '#e5e7eb' }}>{t.name}</strong>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Owner: {t.owner} • {t.vertical}
                        </span>
                        <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 600 }}>
                          100% Completed
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '6px', minWidth: 'auto' }}
                          title="View Details"
                          onClick={() => navigate(`/targets/${t.id}`)}
                        >
                          <Eye size={14} />
                        </button>
                        {canDelete && (
                          <button 
                            className="btn btn-danger" 
                            style={{ padding: '6px', minWidth: 'auto', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                            title="Delete Target"
                            onClick={() => handleDelete(t.id)}
                          >
                            <Trash2 size={14} color="#f87171" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div 
                    style={{ 
                      padding: '32px 16px', 
                      textAlign: 'center', 
                      color: 'var(--text-muted)', 
                      border: '1px dashed var(--border-color)', 
                      borderRadius: '12px',
                      fontSize: '13px'
                    }}
                  >
                    No completed targets found.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Target Modal */}
      {isCreateOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Create New Target</h3>
              <button className="modal-close" onClick={() => setIsCreateOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {formError && <div className="badge red w-full text-center" style={{ marginBottom: '16px', padding: '8px' }}>{formError}</div>}
                
                <div className="form-group">
                  <label className="form-label">Target Name</label>
                  <input type="text" className="form-input" required value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Q3 Sales Growth" />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Vertical Department</label>
                    <select className="form-select" value={formVertical} onChange={e => setFormVertical(e.target.value)}>
                      {departments.map((d) => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Owner</label>
                    <input type="text" className="form-input" required value={formOwner} onChange={e => setFormOwner(e.target.value)} placeholder="e.g. John Doe" />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Location</label>
                  <select className="form-select" value={formLocationId} onChange={e => setFormLocationId(e.target.value)}>
                    <option value="">Unassigned</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input type="date" className="form-input" required value={formStartDate} onChange={e => setFormStartDate(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Deadline</label>
                    <input type="date" className="form-input" required value={formDeadline} onChange={e => setFormDeadline(e.target.value)} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Baseline Value</label>
                    <input type="number" className="form-input" required value={formBaseline} onChange={e => setFormBaseline(e.target.value === '' ? '' : Number(e.target.value))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Target Value</label>
                    <input type="number" className="form-input" required value={formTargetValue} onChange={e => setFormTargetValue(e.target.value === '' ? '' : Number(e.target.value))} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Current Value</label>
                    <input type="number" className="form-input" required value={formCurrentValue} onChange={e => setFormCurrentValue(e.target.value === '' ? '' : Number(e.target.value))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit of Measure</label>
                    <input type="text" className="form-input" required value={formUnit} onChange={e => setFormUnit(e.target.value)} placeholder="e.g. USD, units, hires" />
                  </div>
                </div>

              </div>
              <div className="modal-header" style={{ borderTop: '1px solid var(--border-color)', borderBottom: 'none', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreateOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Target</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Target Modal */}
      {isEditOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Edit Target</h3>
              <button className="modal-close" onClick={() => setIsEditOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleEdit}>
              <div className="modal-body">
                {formError && <div className="badge red w-full text-center" style={{ marginBottom: '16px', padding: '8px' }}>{formError}</div>}
                
                {isPlanner && !isManager && (
                  <div className="badge amber w-full text-center" style={{ marginBottom: '16px', padding: '8px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <HelpCircle size={14} />
                    <span>Planning Analyst View: You can only adjust timeline dates.</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Target Name</label>
                  <input type="text" className="form-input" required value={formName} onChange={e => setFormName(e.target.value)} />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Vertical Department</label>
                    <select className="form-select" disabled={isPlanner && !isManager} value={formVertical} onChange={e => setFormVertical(e.target.value)}>
                      {departments.map((d) => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Owner</label>
                    <input type="text" className="form-input" required value={formOwner} onChange={e => setFormOwner(e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Location</label>
                  <select className="form-select" disabled={isPlanner && !isManager} value={formLocationId} onChange={e => setFormLocationId(e.target.value)}>
                    <option value="">Unassigned</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input type="date" className="form-input" required value={formStartDate} onChange={e => setFormStartDate(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Deadline</label>
                    <input type="date" className="form-input" required value={formDeadline} onChange={e => setFormDeadline(e.target.value)} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Baseline Value</label>
                    <input type="number" className="form-input" disabled={isPlanner && !isManager} required value={formBaseline} onChange={e => setFormBaseline(e.target.value === '' ? '' : Number(e.target.value))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Target Value</label>
                    <input type="number" className="form-input" disabled={isPlanner && !isManager} required value={formTargetValue} onChange={e => setFormTargetValue(e.target.value === '' ? '' : Number(e.target.value))} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Current Value</label>
                    <input type="number" className="form-input" disabled={isPlanner && !isManager} required value={formCurrentValue} onChange={e => setFormCurrentValue(e.target.value === '' ? '' : Number(e.target.value))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit of Measure</label>
                    <input type="text" className="form-input" disabled={isPlanner && !isManager} required value={formUnit} onChange={e => setFormUnit(e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Update Note / Reason</label>
                  <textarea
                    className="form-input"
                    placeholder="Provide a brief explanation for this update..."
                    value={formNote}
                    onChange={e => setFormNote(e.target.value)}
                    style={{
                      height: '60px',
                      padding: '8px 12px',
                      resize: 'none',
                      lineHeight: '1.4'
                    }}
                  />
                </div>
              </div>
              <div className="modal-header" style={{ borderTop: '1px solid var(--border-color)', borderBottom: 'none', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
