import React, { useState } from 'react';
import { useDepartments } from '../context/DepartmentContext';
import type { Department } from '../context/DepartmentContext';
import { useLocations } from '../context/LocationContext';
import { 
  Building2, Plus, Edit2, Trash2, Search, X, Check, User, MapPin
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
  const { departments, loading, addDepartment, updateDepartment, deleteDepartment } = useDepartments();
  const { locations } = useLocations();

  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formColor, setFormColor] = useState(PRESET_COLORS[0]);
  const [formLead, setFormLead] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLocationId, setFormLocationId] = useState('');

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

  const [formError, setFormError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setFormError('');
    setActionLoading(true);

    const code = formCode.trim()
      ? formCode.trim().toUpperCase()
      : formName.trim().substring(0, 3).toUpperCase();

    const selectedLoc = locations.find(l => l.id === formLocationId);
    try {
      if (editingDept) {
        await updateDepartment(editingDept.id, {
          name: formName.trim(),
          code,
          color: formColor,
          lead: formLead.trim() || 'Unassigned',
          description: formDescription.trim(),
          locationId: formLocationId || undefined,
          locationName: selectedLoc?.name || undefined,
        });
      } else {
        await addDepartment({
          name: formName.trim(),
          code,
          color: formColor,
          lead: formLead.trim() || 'Unassigned',
          description: formDescription.trim(),
          locationId: formLocationId || undefined,
          locationName: selectedLoc?.name || undefined,
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

  const filteredDepartments = departments.filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.lead && d.lead.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchLoc = locationFilter === 'all' || d.locationId === locationFilter;
    return matchSearch && matchLoc;
  });

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
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Department & Vertical Customization</h1>
          </div>
          <p style={{ margin: '4px 0 0 48px', color: 'var(--text-muted)', fontSize: '14px' }}>
            Create, color-code, and configure custom department verticals across target tracking & Gantt timelines.
          </p>
        </div>

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
      </div>

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
          {filteredDepartments.map((dept) => (
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
              {!dept.locationName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.25)', marginBottom: '8px' }}>
                  <MapPin size={12} />
                  <span>No location assigned</span>
                </div>
              )}

              <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.5, minHeight: '40px' }}>
                {dept.description || 'No description provided.'}
              </p>
            </div>

            {/* Card Footer Actions */}
            <div
              style={{
                marginTop: 'auto',
                padding: '12px 20px',
                background: 'rgba(255, 255, 255, 0.02)',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '8px'
              }}
            >
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

              {!dept.isSystem && (
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
              )}
            </div>
          </div>
        ))}
      </div>
    )}

      {/* Create / Edit Modal */}
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
              {/* Department Name & Code */}
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

              {/* Department Lead */}
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

              {/* Location */}
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
                {locations.length === 0 && (
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#f59e0b' }}>
                    No locations available. Ask an Admin to create locations first.
                  </p>
                )}
              </div>

              {/* Color Swatches */}
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

              {/* Description */}
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

              {/* Modal Actions */}
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

      {/* Delete Confirmation Modal */}
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
    </div>
  );
};
