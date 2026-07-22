import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDepartments } from '../context/DepartmentContext';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Eye, 
  HelpCircle 
} from 'lucide-react';

export const MasterTargetTracker: React.FC = () => {
  const { api, user } = useAuth();
  const { departments } = useDepartments();
  const navigate = useNavigate();
  
  const [targets, setTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterVertical, setFilterVertical] = useState('');
  const [filterOwner, setFilterOwner] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

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
  const [formBaseline, setFormBaseline] = useState(0);
  const [formTargetValue, setFormTargetValue] = useState(100);
  const [formCurrentValue, setFormCurrentValue] = useState(0);
  const [formUnit, setFormUnit] = useState('');
  const [formDirection, setFormDirection] = useState<'up' | 'down'>('up');
  const [formError, setFormError] = useState('');

  const roles = user?.roles || [];
  const isManager = roles.some(r => ['SUPER_ADMIN', 'SALES_MANAGER', 'PRODUCTION_MANAGER', 'HR_MANAGER'].includes(r));
  const isPlanner = roles.includes('PLANNING_ANALYST');
  const canCreate = isManager; // Planning analysts cannot create targets
  const canEdit = isManager || isPlanner;
  const canDelete = roles.includes('SUPER_ADMIN'); // Only super admin can delete

  const fetchTargets = async () => {
    try {
      setLoading(true);
      let url = `/targets?`;
      if (filterVertical) url += `vertical=${filterVertical}&`;
      if (filterOwner) url += `owner=${filterOwner}&`;
      if (filterStatus) url += `status=${filterStatus}&`;
      
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
  }, [filterVertical, filterOwner, filterStatus]);

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
        direction: formDirection,
      });
      setIsCreateOpen(false);
      resetForm();
      fetchTargets();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Error creating target');
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
        payload.direction = formDirection;
      }

      await api.put(`/targets/${selectedTarget.id}`, payload);
      setIsEditOpen(false);
      resetForm();
      fetchTargets();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Error updating target');
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
    setFormDirection(t.direction);
    setIsEditOpen(true);
  };

  const resetForm = () => {
    setFormName('');
    setFormVertical(departments[0]?.name || '');
    setFormOwner('');
    setFormStartDate('');
    setFormDeadline('');
    setFormBaseline(0);
    setFormTargetValue(100);
    setFormCurrentValue(0);
    setFormUnit('');
    setFormDirection('up');
    setFormError('');
  };

  return (
    <div className="content-container">
      {/* Filters & Actions Header */}
      <div className="flex justify-between items-center glass-card" style={{ padding: '16px 24px', flexWrap: 'wrap', gap: '16px' }}>
        <div className="flex items-center gap-16" style={{ flexWrap: 'wrap' }}>
          {/* Vertical filter */}
          <div className="flex items-center gap-8">
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Vertical:</span>
            <select 
              className="form-select" 
              style={{ width: '130px', padding: '6px 12px' }}
              value={filterVertical}
              onChange={(e) => setFilterVertical(e.target.value)}
            >
              <option value="">All</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-8">
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Status:</span>
            <select 
              className="form-select" 
              style={{ width: '130px', padding: '6px 12px' }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All</option>
              <option value="Green">Green</option>
              <option value="Amber">Amber</option>
              <option value="Red">Red</option>
            </select>
          </div>

          {/* Owner filter */}
          <div className="flex items-center gap-8">
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Owner:</span>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Filter by owner..." 
              style={{ width: '150px', padding: '6px 12px' }}
              value={filterOwner}
              onChange={(e) => setFilterOwner(e.target.value)}
            />
          </div>
        </div>

        {canCreate && (
          <button className="btn btn-primary" onClick={() => { resetForm(); setIsCreateOpen(true); }}>
            <Plus size={16} />
            <span>Create Target</span>
          </button>
        )}
      </div>

      {/* Targets Table */}
      <div className="table-container">
        {loading ? (
          <div className="text-center" style={{ padding: '40px', color: 'var(--text-muted)' }}>Loading tracker...</div>
        ) : (
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
              {targets.length > 0 ? (
                targets.map((t) => {
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
                            {/* Target/Expected Marker */}
                            <div 
                              className="pace-target-marker" 
                              style={{ left: `${expectedPct}%` }}
                            />
                            {/* Actual Progress Fill */}
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
                    No targets found. Add a target or change your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

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
                    <input type="number" className="form-input" required value={formBaseline} onChange={e => setFormBaseline(Number(e.target.value))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Target Value</label>
                    <input type="number" className="form-input" required value={formTargetValue} onChange={e => setFormTargetValue(Number(e.target.value))} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Current Value</label>
                    <input type="number" className="form-input" required value={formCurrentValue} onChange={e => setFormCurrentValue(Number(e.target.value))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit of Measure</label>
                    <input type="text" className="form-input" required value={formUnit} onChange={e => setFormUnit(e.target.value)} placeholder="e.g. USD, units, hires" />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Pace Direction</label>
                  <select className="form-select" value={formDirection} onChange={e => setFormDirection(e.target.value as 'up' | 'down')}>
                    <option value="up">Upward (Greater value is better, e.g. Revenues)</option>
                    <option value="down">Downward (Lower value is better, e.g. Safety Incidents)</option>
                  </select>
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
                    <input type="number" className="form-input" disabled={isPlanner && !isManager} required value={formBaseline} onChange={e => setFormBaseline(Number(e.target.value))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Target Value</label>
                    <input type="number" className="form-input" disabled={isPlanner && !isManager} required value={formTargetValue} onChange={e => setFormTargetValue(Number(e.target.value))} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Current Value</label>
                    <input type="number" className="form-input" disabled={isPlanner && !isManager} required value={formCurrentValue} onChange={e => setFormCurrentValue(Number(e.target.value))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit of Measure</label>
                    <input type="text" className="form-input" disabled={isPlanner && !isManager} required value={formUnit} onChange={e => setFormUnit(e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Pace Direction</label>
                  <select className="form-select" disabled={isPlanner && !isManager} value={formDirection} onChange={e => setFormDirection(e.target.value as 'up' | 'down')}>
                    <option value="up">Upward (Greater value is better)</option>
                    <option value="down">Downward (Lower value is better)</option>
                  </select>
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
