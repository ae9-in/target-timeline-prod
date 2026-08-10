import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  UserPlus, Search, RefreshCw, MoreVertical, ShieldAlert,
  Edit2, Trash2, Briefcase, MapPin, Layers
} from 'lucide-react';

interface EmployeeRow {
  id: string;
  name: string;
  employmentType: 'FULLTIME' | 'INTERN';
  departmentId: string;
  locationId: string;
  department: {
    id: string;
    name: string;
    code: string;
    color: string;
  };
  location: {
    id: string;
    name: string;
  };
}

interface DepartmentOption {
  id: string;
  name: string;
  color: string;
}

interface LocationOption {
  id: string;
  name: string;
}

interface EmployeeForm {
  name: string;
  employmentType: 'FULLTIME' | 'INTERN';
  departmentId: string;
  locationId: string;
}

export const AdminEmployees: React.FC = () => {
  const { api } = useAuth();
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterLoc, setFilterLoc] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeForm>({
    name: '',
    employmentType: 'FULLTIME',
    departmentId: '',
    locationId: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch locations, departments, and employees in parallel
      const [deptRes, locRes, empRes] = await Promise.all([
        api.get('/departments'),
        api.get('/locations'),
        api.get('/employees'),
      ]);
      setDepartments(deptRes.data);
      setLocations(locRes.data);
      setEmployees(empRes.data);
      
      // Select defaults for form if none set
      if (deptRes.data.length > 0 && !form.departmentId) {
        setForm(prev => ({ ...prev, departmentId: deptRes.data[0].id }));
      }
      if (locRes.data.length > 0 && !form.locationId) {
        setForm(prev => ({ ...prev, locationId: locRes.data[0].id }));
      }
    } catch (err: any) {
      console.error('Failed to fetch employee management data', err);
      setError('Failed to load employees, departments, or locations. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await api.get('/employees');
      setEmployees(res.data);
    } catch (err) {
      console.error('Failed to refresh employees', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setForm({
      name: '',
      employmentType: 'FULLTIME',
      departmentId: departments[0]?.id || '',
      locationId: locations[0]?.id || '',
    });
    setModalMode('create');
    setSelectedId(null);
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (emp: EmployeeRow) => {
    setForm({
      name: emp.name,
      employmentType: emp.employmentType,
      departmentId: emp.departmentId,
      locationId: emp.locationId,
    });
    setModalMode('edit');
    setSelectedId(emp.id);
    setError('');
    setOpenMenu(null);
    setShowModal(true);
  };

  const handleDelete = async (empId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete employee "${name}"?`)) return;
    setActionLoading(empId);
    setOpenMenu(null);
    try {
      await api.delete(`/employees/${empId}`);
      setEmployees(prev => prev.filter(e => e.id !== empId));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete employee');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Please enter employee name.');
      return;
    }
    if (!form.departmentId) {
      setError('Please select a department.');
      return;
    }
    if (!form.locationId) {
      setError('Please select a location.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (modalMode === 'create') {
        const res = await api.post('/employees', form);
        setEmployees(prev => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        const res = await api.patch(`/employees/${selectedId}`, form);
        setEmployees(prev => prev.map(e => e.id === selectedId ? res.data : e).sort((a, b) => a.name.localeCompare(b.name)));
      }
      setShowModal(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save employee. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Local filtering logic
  const filteredEmployees = employees.filter((emp) => {
    const matchSearch = !search || emp.name.toLowerCase().includes(search.toLowerCase());
    const matchDept = !filterDept || emp.departmentId === filterDept;
    const matchLoc = !filterLoc || emp.locationId === filterLoc;
    return matchSearch && matchDept && matchLoc;
  });

  return (
    <main className="main-content" style={{ padding: '32px' }}>
      {error && !showModal && (
        <div
          className="badge red w-full"
          style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '8px' }}
        >
          <ShieldAlert size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
          <input
            id="admin-employees-search"
            className="form-input"
            placeholder="Search by name..."
            style={{ paddingLeft: '36px' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          id="admin-employees-filter-dept"
          className="form-input"
          style={{ width: '180px' }}
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <select
          id="admin-employees-filter-loc"
          className="form-input"
          style={{ width: '180px' }}
          value={filterLoc}
          onChange={(e) => setFilterLoc(e.target.value)}
        >
          <option value="">All Locations</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>

        <button id="admin-employees-refresh-btn" className="btn btn-secondary" onClick={handleRefresh}>
          <RefreshCw size={14} />
        </button>

        <button
          id="admin-employees-add-btn"
          className="btn btn-admin"
          onClick={handleOpenCreate}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <UserPlus size={15} />
          Add Employee
        </button>
      </div>

      {/* Employees Table */}
      <div className="card" style={{ overflow: 'visible', minHeight: '340px' }}>
        <div style={{ overflowX: 'auto', overflowY: 'visible', minHeight: '300px' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Name', 'Employment Type', 'Department', 'Location', 'Actions'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No employees found
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const isLoading = actionLoading === emp.id;
                  return (
                    <tr
                      key={emp.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        opacity: isLoading ? 0.5 : 1,
                      }}
                    >
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>
                        {emp.name}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        <span
                          className={`badge ${emp.employmentType === 'FULLTIME' ? 'green' : 'amber'}`}
                          style={{ textTransform: 'none', letterSpacing: 'normal' }}
                        >
                          {emp.employmentType === 'FULLTIME' ? 'Full-Time' : 'Intern'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: `${emp.department.color}20`,
                            color: emp.department.color,
                            border: `1px solid ${emp.department.color}40`,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          <Layers size={11} />
                          {emp.department.name}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={13} style={{ color: 'var(--text-muted)' }} />
                          {emp.location.name}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', position: 'relative' }}>
                        <div style={{ position: 'relative' }}>
                          <button
                            id={`admin-employee-menu-${emp.id}`}
                            className="btn btn-secondary"
                            style={{ padding: '6px 8px' }}
                            onClick={() => setOpenMenu(openMenu === emp.id ? null : emp.id)}
                            disabled={isLoading}
                          >
                            <MoreVertical size={14} />
                          </button>
                          {openMenu === emp.id && (
                            <div
                              style={{
                                position: 'absolute',
                                right: 0,
                                top: '100%',
                                zIndex: 100,
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                padding: '6px',
                                minWidth: '150px',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                              }}
                            >
                              <div
                                onClick={() => handleOpenEdit(emp)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '8px 10px',
                                  cursor: 'pointer',
                                  borderRadius: '6px',
                                  fontSize: '13px',
                                  color: 'var(--text-secondary)',
                                  transition: 'background 0.15s',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                              >
                                <Edit2 size={13} />
                                <span>Edit Employee</span>
                              </div>
                              <div
                                onClick={() => handleDelete(emp.id, emp.name)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '8px 10px',
                                  cursor: 'pointer',
                                  borderRadius: '6px',
                                  fontSize: '13px',
                                  color: '#ef4444',
                                  transition: 'background 0.15s',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                              >
                                <Trash2 size={13} />
                                <span>Delete</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="card" style={{ width: '460px', maxWidth: '95vw', padding: '32px', borderRadius: '16px' }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Briefcase size={18} style={{ color: 'var(--admin-accent, #f59e0b)' }} />
              {modalMode === 'create' ? 'Add New Employee' : 'Edit Employee'}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Enter the employee details below. Manually entered employees will not have system user accounts.
            </p>

            {error && (
              <div
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid #ef4444',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px',
                  fontSize: '13px',
                  color: '#ef4444',
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Full Name</label>
                <input
                  id="employee-name"
                  className="form-input"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Jane Smith"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Employment Type</label>
                <select
                  id="employee-type"
                  className="form-input"
                  value={form.employmentType}
                  onChange={(e) => setForm({ ...form, employmentType: e.target.value as any })}
                >
                  <option value="FULLTIME">Full-Time</option>
                  <option value="INTERN">Intern</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Department</label>
                <select
                  id="employee-department"
                  className="form-input"
                  value={form.departmentId}
                  onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Location</label>
                <select
                  id="employee-location"
                  className="form-input"
                  value={form.locationId}
                  onChange={(e) => setForm({ ...form, locationId: e.target.value })}
                >
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  id="employee-submit-btn"
                  type="submit"
                  className="btn btn-admin"
                  style={{ flex: 1 }}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};
