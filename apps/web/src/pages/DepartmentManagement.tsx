import React, { useState } from 'react';
import { useDepartments } from '../context/DepartmentContext';
import type { Department, SubDepartment } from '../context/DepartmentContext';
import { useLocations } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, Plus, Edit2, Trash2, Search, X, Check, User, MapPin, Network, Layers, Info
} from 'lucide-react';

const PRESET_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#6366f1', // Indigo
  '#ef4444', // Red
  '#14b8a6', // Teal
  '#f97316', // Orange
];

export const DepartmentManagement: React.FC = () => {
  const { 
    departments, loading, addDepartment, updateDepartment, deleteDepartment,
    subDepartments, addSubDepartment, updateSubDepartment, deleteSubDepartment
  } = useDepartments();
  const { locations } = useLocations();
  const { user } = useAuth();
  const isSuperAdmin = (user?.roles?.includes('SUPER_ADMIN') || user?.roles?.includes('ADMIN')) ?? false;

  const [activeTab, setActiveTab] = useState<'departments' | 'subdepartments' | 'hierarchy'>('departments');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  
  // Department Modals State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Department Form State
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formColor, setFormColor] = useState(PRESET_COLORS[0]);
  const [formLead, setFormLead] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLocationId, setFormLocationId] = useState('');

  // Sub-Department Modals & Form State
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<SubDepartment | null>(null);
  const [deletingSubId, setDeletingSubId] = useState<string | null>(null);

  const [subFormName, setSubFormName] = useState('');
  const [subFormCategory, setSubFormCategory] = useState('');
  const [subFormFullTime, setSubFormFullTime] = useState('');
  const [subFormInterns, setSubFormInterns] = useState('');

  const [formError, setFormError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Auto-select first department when changing to sub-departments tab
  React.useEffect(() => {
    if (activeTab === 'subdepartments' && !selectedDeptId && departments.length > 0) {
      setSelectedDeptId(departments[0].id);
    }
  }, [activeTab, departments, selectedDeptId]);

  const openCreateModal = () => {
    setEditingDept(null);
    setFormName('');
    setFormCode('');
    setFormColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    setFormLead('');
    setFormDescription('');
    setFormLocationId(locations[0]?.id || '');
    setIsModalOpen(true);
  };

  const openEditModal = (dept: Department) => {
    setEditingDept(dept);
    setFormName(dept.name);
    setFormCode(dept.code);
    setFormColor(dept.color);
    setFormLead(dept.lead || '');
    setFormDescription(dept.description || '');
    setFormLocationId(dept.locationId || locations[0]?.id || '');
    setIsModalOpen(true);
  };

  const openCreateSubModal = () => {
    setEditingSub(null);
    setSubFormName('');
    setSubFormCategory('');
    setSubFormFullTime('');
    setSubFormInterns('');
    setFormError('');
    setIsSubModalOpen(true);
  };

  const openEditSubModal = (sub: SubDepartment) => {
    setEditingSub(sub);
    setSubFormName(sub.name);
    setSubFormCategory(sub.category || '');
    setSubFormFullTime(sub.fullTime || '');
    setSubFormInterns(sub.interns || '');
    setFormError('');
    setIsSubModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setFormError('');
    setActionLoading(true);

    const code = formCode.trim()
      ? formCode.trim().toUpperCase()
      : formName.trim().substring(0, 3).toUpperCase();

    try {
      if (editingDept) {
        await updateDepartment(editingDept.id, {
          name: formName.trim(),
          code,
          color: formColor,
          lead: formLead.trim() || 'Unassigned',
          description: formDescription.trim(),
          locationId: formLocationId || undefined,
        });
      } else {
        await addDepartment({
          name: formName.trim(),
          code,
          color: formColor,
          lead: formLead.trim() || 'Unassigned',
          description: formDescription.trim(),
          locationId: formLocationId || undefined,
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Failed to save department:', err);
      const msg = err.response?.data?.message;
      setFormError(typeof msg === 'string' ? msg : 'Failed to save department. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subFormName.trim() || !selectedDeptId) return;
    setFormError('');
    setActionLoading(true);

    try {
      if (editingSub) {
        await updateSubDepartment(editingSub.id, {
          name: subFormName.trim(),
          departmentId: selectedDeptId,
          category: subFormCategory || undefined,
          fullTime: subFormFullTime || undefined,
          interns: subFormInterns || undefined,
        });
      } else {
        await addSubDepartment({
          name: subFormName.trim(),
          departmentId: selectedDeptId,
          category: subFormCategory || undefined,
          fullTime: subFormFullTime || undefined,
          interns: subFormInterns || undefined,
        });
      }
      setIsSubModalOpen(false);
    } catch (err: any) {
      console.error('Failed to save sub-department:', err);
      const msg = err.response?.data?.message;
      setFormError(typeof msg === 'string' ? msg : 'Failed to save sub-department.');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (deletingId) {
      setFormError('');
      try {
        await deleteDepartment(deletingId);
        setDeletingId(null);
      } catch (err: any) {
        console.error('Failed to delete department:', err);
        alert(err.response?.data?.message || 'Failed to delete department.');
      }
    }
  };

  const confirmDeleteSub = async () => {
    if (deletingSubId) {
      try {
        await deleteSubDepartment(deletingSubId);
        setDeletingSubId(null);
      } catch (err: any) {
        console.error('Failed to delete sub-department:', err);
        alert(err.response?.data?.message || 'Failed to delete sub-department.');
      }
    }
  };

  const filteredDepartments = departments.filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.lead && d.lead.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchLoc = locationFilter === 'all' || d.locationId === locationFilter;
    return matchSearch && matchLoc;
  });

  const selectedDepartment = departments.find(d => d.id === selectedDeptId);
  const activeSubDepartments = subDepartments.filter(s => s.departmentId === selectedDeptId);

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1400px', margin: '0 auto', color: 'var(--text-primary)' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#60a5fa'
              }}
            >
              <Building2 size={22} />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Company Structure Management</h1>
          </div>
          <p style={{ margin: '4px 0 0 48px', color: 'var(--text-muted)', fontSize: '14px' }}>
            Manage locations, departments, custom sub-departments, and visualize organizational hierarchy.
          </p>
        </div>

        {isSuperAdmin && activeTab === 'departments' && (
          <button
            type="button"
            onClick={openCreateModal}
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              transition: 'all 0.15s ease'
            }}
          >
            <Plus size={18} />
            <span>Add Department</span>
          </button>
        )}

        {isSuperAdmin && activeTab === 'subdepartments' && selectedDeptId && (
          <button
            type="button"
            onClick={openCreateSubModal}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              transition: 'all 0.15s ease'
            }}
          >
            <Plus size={18} />
            <span>Add Sub-Department</span>
          </button>
        )}
      </div>

      {/* Tabs Navigation */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '24px',
        paddingBottom: '2px'
      }}>
        <button
          onClick={() => setActiveTab('departments')}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: activeTab === 'departments' ? 600 : 500,
            color: activeTab === 'departments' ? '#60a5fa' : 'var(--text-muted)',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'departments' ? '2px solid #3b82f6' : '2px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Building2 size={16} />
          Departments
        </button>

        <button
          onClick={() => setActiveTab('subdepartments')}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: activeTab === 'subdepartments' ? 600 : 500,
            color: activeTab === 'subdepartments' ? '#34d399' : 'var(--text-muted)',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'subdepartments' ? '2px solid #10b981' : '2px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Layers size={16} />
          Sub-Departments
        </button>

        <button
          onClick={() => setActiveTab('hierarchy')}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: activeTab === 'hierarchy' ? 600 : 500,
            color: activeTab === 'hierarchy' ? '#8b5cf6' : 'var(--text-muted)',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'hierarchy' ? '2px solid #8b5cf6' : '2px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Network size={16} />
          Hierarchy Structure
        </button>
      </div>

      {/* ── Tab Content: Departments ── */}
      {activeTab === 'departments' && (
        <>
          {/* Controls Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '28px'
            }}
          >
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search departments or leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'rgba(0, 0, 0, 0.2)',
                  color: '#ffffff',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Location Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={15} style={{ color: 'var(--text-muted)' }} />
              <select
                value={locationFilter}
                onChange={e => setLocationFilter(e.target.value)}
                style={{
                  padding: '7px 12px', borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'rgba(0,0,0,0.2)', color: '#fff',
                  fontSize: '13px', outline: 'none', cursor: 'pointer',
                }}
              >
                <option value="all" style={{ background: '#141520', color: '#ffffff' }}>All Locations</option>
                {locations.map(l => (
                  <option key={l.id} value={l.id} style={{ background: '#141520', color: '#ffffff' }}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Total Active Departments: <strong style={{ color: '#ffffff' }}>{departments.length}</strong>
            </div>
          </div>

          {loading && departments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
              Loading departments...
            </div>
          ) : filteredDepartments.length === 0 ? (
            <div className="glass-card text-center" style={{ padding: '60px 40px' }}>
              <Building2 size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px', opacity: 0.5 }} />
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No Departments Found</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '480px', margin: '0 auto', marginBottom: '20px' }}>
                {searchQuery || locationFilter !== 'all' 
                  ? 'No departments match your current filter settings.' 
                  : 'There are no departments configured yet. Click "Add Department" to create one.'}
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: '20px'
              }}
            >
              {filteredDepartments.map((dept) => {
                const subCount = subDepartments.filter(s => s.departmentId === dept.id).length;
                return (
                  <div
                    key={dept.id}
                    style={{
                      background: '#0f1019',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                      position: 'relative'
                    }}
                  >
                    {/* Top Color Accent Line */}
                    <div style={{ height: '5px', background: dept.color }} />

                    <div style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '14px',
                              height: '14px',
                              borderRadius: '4px',
                              background: dept.color
                            }}
                          />
                          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>{dept.name}</h3>
                        </div>

                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.05em',
                            background: `${dept.color}22`,
                            color: dept.color,
                            border: `1px solid ${dept.color}44`
                          }}
                        >
                          {dept.code}
                        </span>
                      </div>

                      {/* Lead & Description */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        <User size={14} style={{ color: dept.color }} />
                        <span>Lead: <strong style={{ color: '#e5e7eb' }}>{dept.lead || 'Unassigned'}</strong></span>
                      </div>

                      {/* Location Badge */}
                      {dept.locationName && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                          <MapPin size={12} style={{ color: '#60a5fa' }} />
                          <span style={{ color: '#93c5fd' }}>{dept.locationName}</span>
                        </div>
                      )}

                      {/* Sub-Departments Count */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                        <Layers size={12} style={{ color: '#10b981' }} />
                        <span>Sub-departments: <strong style={{ color: '#ffffff' }}>{subCount}</strong></span>
                      </div>

                      <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.5, minHeight: '40px' }}>
                        {dept.description || 'No description provided.'}
                      </p>
                    </div>

                    <div
                      style={{
                        marginTop: 'auto',
                        padding: '12px 20px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px'
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDeptId(dept.id);
                          setActiveTab('subdepartments');
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#60a5fa',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Layers size={13} />
                        <span>Manage Subs</span>
                      </button>

                      {isSuperAdmin && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => openEditModal(dept)}
                            style={{
                              background: 'rgba(255, 255, 255, 0.06)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#ffffff',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 500,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            <Edit2 size={13} />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingId(dept.id)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.12)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#f87171',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 500,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Tab Content: Sub-Departments ── */}
      {activeTab === 'subdepartments' && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px' }}>
          {/* Left Sidebar: Department Selection */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Select Department
            </h4>
            {departments.map((dept) => (
              <button
                key={dept.id}
                onClick={() => setSelectedDeptId(dept.id)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: selectedDeptId === dept.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  color: selectedDeptId === dept.id ? '#60a5fa' : 'var(--text-primary)',
                  fontWeight: selectedDeptId === dept.id ? 600 : 500,
                  fontSize: '13px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderLeft: `3px solid ${selectedDeptId === dept.id ? dept.color : 'transparent'}`,
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dept.color }} />
                <span>{dept.name}</span>
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '10px' }}>
                  {subDepartments.filter(s => s.departmentId === dept.id).length}
                </span>
              </button>
            ))}
          </div>

          {/* Right Area: Sub-Departments list */}
          <div>
            {!selectedDeptId ? (
              <div className="glass-card text-center" style={{ padding: '60px 40px' }}>
                <Layers size={40} style={{ color: 'var(--text-muted)', marginBottom: '12px', opacity: 0.5 }} />
                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>No Department Selected</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Select a department vertical from the left panel to manage its sub-departments.</p>
              </div>
            ) : (
              <div>
                {/* Header for selected dept */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  marginBottom: '20px'
                }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: selectedDepartment?.color }} />
                      {selectedDepartment?.name}
                    </h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Code: {selectedDepartment?.code} • Manager/Lead: {selectedDepartment?.lead}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Total Sub-departments: <strong style={{ color: '#fff' }}>{activeSubDepartments.length}</strong>
                  </div>
                </div>

                {activeSubDepartments.length === 0 ? (
                  <div className="glass-card text-center" style={{ padding: '48px 30px' }}>
                    <Layers size={40} style={{ color: 'var(--text-muted)', marginBottom: '16px', opacity: 0.4 }} />
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>No Sub-Departments</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '380px', margin: '0 auto 16px' }}>
                      There are no sub-departments configured for the {selectedDepartment?.name} vertical.
                    </p>
                    {isSuperAdmin && (
                      <button
                        onClick={openCreateSubModal}
                        className="btn btn-primary"
                        style={{ fontSize: '12px', padding: '8px 16px' }}
                      >
                        <Plus size={14} style={{ marginRight: '4px' }} /> Create Sub-Department
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                    {activeSubDepartments.map((sub) => (
                      <div
                        key={sub.id}
                        style={{
                          background: '#0d0e15',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: '10px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                        }}
                      >
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700, color: '#fff' }}>{sub.name}</h4>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Category:</span>
                            <strong style={{ color: '#fff' }}>{sub.category || 'N/A'}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Full-Time:</span>
                            <strong style={{ color: '#fff' }}>{sub.fullTime || 'N/A'}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Interns:</span>
                            <strong style={{ color: '#fff' }}>{sub.interns || 'N/A'}</strong>
                          </div>
                        </div>

                        {isSuperAdmin && (
                          <div style={{
                            marginTop: 'auto',
                            display: 'flex',
                            gap: '8px',
                            justifyContent: 'flex-end',
                            borderTop: '1px solid rgba(255,255,255,0.05)',
                            paddingTop: '10px'
                          }}>
                            <button
                              onClick={() => openEditSubModal(sub)}
                              style={{
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                color: '#fff',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Edit2 size={11} />
                              Edit
                            </button>
                            <button
                              onClick={() => setDeletingSubId(sub.id)}
                              style={{
                                background: 'rgba(239, 68, 68, 0.08)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                color: '#f87171',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Trash2 size={11} />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab Content: Hierarchy Structure ── */}
      {activeTab === 'hierarchy' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{
            background: 'rgba(59, 130, 246, 0.05)',
            border: '1px solid rgba(59, 130, 246, 0.15)',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            color: '#93c5fd'
          }}>
            <Info size={16} />
            <span>This tree details the workflow hierarchy. Work flows from Locations to custom Department verticals and their respective Sub-Departments.</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', position: 'relative' }}>
            {locations.map((loc) => {
              const locDepts = departments.filter(d => d.locationId === loc.id);
              return (
                <div key={loc.id} style={{
                  background: '#0d0e15',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                }}>
                  {/* Location Header Node */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    paddingBottom: '12px',
                    marginBottom: '20px'
                  }}>
                    <MapPin size={18} style={{ color: '#ef4444' }} />
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fff' }}>
                      Location: {loc.name}
                    </h3>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: '10px' }}>
                      {locDepts.length} departments
                    </span>
                  </div>

                  {locDepts.length === 0 ? (
                    <div style={{ fontStyle: 'italic', fontSize: '13px', color: 'var(--text-muted)', padding: '8px 0' }}>
                      No departments configured under this location.
                    </div>
                  ) : (
                    /* Grid of Departments in Location */
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
                      {locDepts.map((dept) => {
                        const deptSubs = subDepartments.filter(s => s.departmentId === dept.id);
                        return (
                          <div key={dept.id} style={{
                            background: '#141520',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                            borderLeft: `4px solid ${dept.color}`
                          }}>
                            <div style={{ padding: '16px' }}>
                              {/* Department header */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#fff' }}>{dept.name}</h4>
                                <span style={{ fontSize: '11px', background: `${dept.color}22`, color: dept.color, border: `1px solid ${dept.color}44`, padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                  {dept.code}
                                </span>
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                                Lead: <strong style={{ color: 'var(--text-primary)' }}>{dept.lead}</strong>
                              </div>

                              {/* Nested Sub-Departments list */}
                              <div style={{
                                background: 'rgba(0,0,0,0.15)',
                                borderRadius: '8px',
                                padding: '12px',
                                border: '1px solid rgba(255,255,255,0.03)'
                              }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                                  Sub-Departments ({deptSubs.length})
                                </span>

                                {deptSubs.length === 0 ? (
                                  <div style={{ fontStyle: 'italic', fontSize: '12px', color: 'var(--text-muted)' }}>
                                    No sub-departments defined.
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {deptSubs.map((sub) => (
                                      <div key={sub.id} style={{
                                        background: '#0d0e15',
                                        border: '1px solid rgba(255,255,255,0.04)',
                                        borderRadius: '6px',
                                        padding: '8px 10px',
                                        fontSize: '12px'
                                      }}>
                                        <div style={{ fontWeight: 600, color: '#fff', marginBottom: '4px' }}>{sub.name}</div>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '10px', color: 'var(--text-muted)' }}>
                                          {sub.category && <span style={{ background: 'rgba(255,255,255,0.04)', padding: '1px 4px', borderRadius: '3px' }}>Category: {sub.category}</span>}
                                          {sub.fullTime && <span style={{ background: 'rgba(255,255,255,0.04)', padding: '1px 4px', borderRadius: '3px' }}>Full-Time: {sub.fullTime}</span>}
                                          {sub.interns && <span style={{ background: 'rgba(255,255,255,0.04)', padding: '1px 4px', borderRadius: '3px' }}>Interns: {sub.interns}</span>}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {locations.length === 0 && (
              <div className="glass-card text-center" style={{ padding: '48px' }}>
                <MapPin size={40} style={{ color: 'var(--text-muted)', marginBottom: '12px', opacity: 0.4 }} />
                <h3>No Locations Defined</h3>
                <p style={{ color: 'var(--text-muted)' }}>Locations are required to render hierarchy. Create locations first.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT DEPARTMENT MODAL ── */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            style={{
              background: '#141520',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '520px',
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
                <Building2 size={20} style={{ color: formColor }} />
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                  {editingDept ? 'Edit Department' : 'Create New Department'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
              {formError && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid #ef4444',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '16px',
                  fontSize: '13px',
                  color: '#f87171',
                  textAlign: 'left'
                }}>
                  {formError}
                </div>
              )}
              
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Department Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Operations"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: '#0d0e15',
                      color: '#ffffff',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Code (3-letter)
                  </label>
                  <input
                    type="text"
                    maxLength={3}
                    placeholder="OPS"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase())}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: '#0d0e15',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: 700,
                      outline: 'none',
                      textTransform: 'uppercase'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Department Head / Lead
                </label>
                <input
                  type="text"
                  placeholder="e.g. Michael Scott"
                  value={formLead}
                  onChange={(e) => setFormLead(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: '#0d0e15',
                    color: '#ffffff',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  <MapPin size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                  Location *
                </label>
                <select
                  required
                  value={formLocationId}
                  onChange={e => setFormLocationId(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px',
                    borderRadius: '8px', border: '1px solid var(--border-color)',
                    background: '#0d0e15', color: '#ffffff', fontSize: '14px',
                    outline: 'none', cursor: 'pointer',
                  }}
                >
                  <option value="" style={{ background: '#141520', color: '#ffffff' }}>Select a location...</option>
                  {locations.map(l => (
                    <option key={l.id} value={l.id} style={{ background: '#141520', color: '#ffffff' }}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Accent Color
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {PRESET_COLORS.map((c) => (
                    <div
                      key={c}
                      onClick={() => setFormColor(c)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: c,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: formColor === c ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                        boxShadow: formColor === c ? `0 0 10px ${c}` : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {formColor === c && <Check size={16} style={{ color: '#ffffff' }} />}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Description / Mandate
                </label>
                <textarea
                  rows={3}
                  placeholder="Define key objectives and scope of this department..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: '#0d0e15',
                    color: '#ffffff',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
                  disabled={actionLoading}
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                    opacity: actionLoading ? 0.7 : 1
                  }}
                >
                  {actionLoading ? 'Saving...' : (editingDept ? 'Save Changes' : 'Create Department')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT SUB-DEPARTMENT MODAL ── */}
      {isSubModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setIsSubModalOpen(false)}
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
                <Layers size={20} style={{ color: '#10b981' }} />
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                  {editingSub ? 'Edit Sub-Department' : 'Create Sub-Department'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsSubModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubSubmit} style={{ padding: '24px' }}>
              {formError && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid #ef4444',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '16px',
                  fontSize: '13px',
                  color: '#f87171',
                  textAlign: 'left'
                }}>
                  {formError}
                </div>
              )}

              {/* Selected Department Info */}
              <div style={{ marginBottom: '16px', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Parent Department Vertical</span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: selectedDepartment?.color }} />
                  {selectedDepartment?.name}
                </div>
              </div>

              {/* Sub-Department Name */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Sub-Department Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Frontend Development"
                  value={subFormName}
                  onChange={(e) => setSubFormName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: '#0d0e15',
                    color: '#ffffff',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Category Options */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Category (Optional)
                </label>
                <select
                  value={subFormCategory}
                  onChange={e => setSubFormCategory(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px',
                    borderRadius: '8px', border: '1px solid var(--border-color)',
                    background: '#0d0e15', color: '#ffffff', fontSize: '14px',
                    outline: 'none', cursor: 'pointer',
                  }}
                >
                  <option value="" style={{ background: '#141520' }}>Select category...</option>
                  <option value="Technical" style={{ background: '#141520' }}>Technical</option>
                  <option value="Operations" style={{ background: '#141520' }}>Operations</option>
                  <option value="Administrative" style={{ background: '#141520' }}>Administrative</option>
                  <option value="Sales" style={{ background: '#141520' }}>Sales</option>
                  <option value="Support" style={{ background: '#141520' }}>Support</option>
                  <option value="Research" style={{ background: '#141520' }}>Research</option>
                  <option value="Other" style={{ background: '#141520' }}>Other</option>
                </select>
              </div>

              {/* Full-Time & Interns Options */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Full-Time Roles (Optional)
                  </label>
                  <select
                    value={subFormFullTime}
                    onChange={e => setSubFormFullTime(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px',
                      borderRadius: '8px', border: '1px solid var(--border-color)',
                      background: '#0d0e15', color: '#ffffff', fontSize: '14px',
                      outline: 'none', cursor: 'pointer',
                    }}
                  >
                    <option value="" style={{ background: '#141520' }}>Select...</option>
                    <option value="Yes" style={{ background: '#141520' }}>Yes</option>
                    <option value="No" style={{ background: '#141520' }}>No</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Intern Roles (Optional)
                  </label>
                  <select
                    value={subFormInterns}
                    onChange={e => setSubFormInterns(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px',
                      borderRadius: '8px', border: '1px solid var(--border-color)',
                      background: '#0d0e15', color: '#ffffff', fontSize: '14px',
                      outline: 'none', cursor: 'pointer',
                    }}
                  >
                    <option value="" style={{ background: '#141520' }}>Select...</option>
                    <option value="Yes" style={{ background: '#141520' }}>Yes</option>
                    <option value="No" style={{ background: '#141520' }}>No</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsSubModalOpen(false)}
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
                  disabled={actionLoading}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                    opacity: actionLoading ? 0.7 : 1
                  }}
                >
                  {actionLoading ? 'Saving...' : (editingSub ? 'Save Changes' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE DEPARTMENT CONFIRMATION MODAL */}
      {deletingId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 110,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setDeletingId(null)}
        >
          <div
            style={{
              background: '#141520',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '14px',
              padding: '24px',
              maxWidth: '420px',
              width: '100%',
              textAlign: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}
            >
              <Trash2 size={24} />
            </div>

            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700 }}>Delete Department?</h3>
            <p style={{ margin: '0 0 24px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Are you sure you want to remove this department? Any associated targets will remain accessible.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                style={{
                  background: '#ef4444',
                  border: 'none',
                  color: '#ffffff',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE SUB-DEPARTMENT CONFIRMATION MODAL */}
      {deletingSubId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 110,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setDeletingSubId(null)}
        >
          <div
            style={{
              background: '#141520',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '14px',
              padding: '24px',
              maxWidth: '420px',
              width: '100%',
              textAlign: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}
            >
              <Trash2 size={24} />
            </div>

            <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700 }}>Delete Sub-Department?</h3>
            <p style={{ margin: '0 0 24px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Are you sure you want to remove this sub-department? Associated targets will have their sub-department unassigned.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setDeletingSubId(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDeleteSub}
                style={{
                  background: '#ef4444',
                  border: 'none',
                  color: '#ffffff',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
