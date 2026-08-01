import React, { useState } from 'react';
import { useLocations } from '../context/LocationContext';
import { useDepartments } from '../context/DepartmentContext';
import type { Location } from '../context/LocationContext';
import { MapPin, Plus, Edit2, ToggleLeft, ToggleRight, X, Check, Target, Clock } from 'lucide-react';

const FIELD_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid var(--border-color)',
  background: '#0d0e15',
  color: '#ffffff',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
};

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: '6px',
};

export const LocationManagement: React.FC = () => {
  const { allLocations, loading, createLocation, updateLocation, setLocationStatus } = useLocations();
  const { refreshDepartments } = useDepartments();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState<Location | null>(null);
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formTimezone, setFormTimezone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCreate = () => {
    setEditingLoc(null);
    setFormName('');
    setFormAddress('');
    setFormTimezone('');
    setError(null);
    setIsModalOpen(true);
  };

  const openEdit = (loc: Location) => {
    setEditingLoc(loc);
    setFormName(loc.name);
    setFormAddress(loc.address || '');
    setFormTimezone(loc.timezone || '');
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editingLoc) {
        await updateLocation(editingLoc.id, {
          name: formName.trim(),
          address: formAddress.trim() || undefined,
          timezone: formTimezone.trim() || undefined,
        });
      } else {
        await createLocation({
          name: formName.trim(),
          address: formAddress.trim() || undefined,
          timezone: formTimezone.trim() || undefined,
        });
      }
      setIsModalOpen(false);
      await refreshDepartments();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join('; ') : (msg || 'Failed to save location'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (loc: Location) => {
    const newStatus = loc.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await setLocationStatus(loc.id, newStatus);
      await refreshDepartments();
    } catch (err) {
      console.error('Failed to toggle location status:', err);
    }
  };

  const activeCount = allLocations.filter(l => l.status === 'ACTIVE').length;
  const inactiveCount = allLocations.filter(l => l.status === 'INACTIVE').length;

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1200px', margin: '0 auto', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(59,130,246,0.2))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(16,185,129,0.3)', color: '#34d399'
            }}>
              <MapPin size={20} />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Location Management</h1>
          </div>
          <p style={{ margin: '4px 0 0 48px', color: 'var(--text-muted)', fontSize: '14px' }}>
            Create and manage company locations. All active locations are immediately available across departments, timelines, and analytics.
          </p>
        </div>
        <button
          onClick={openCreate}
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#fff', border: 'none', padding: '10px 18px',
            borderRadius: '8px', fontWeight: 600, fontSize: '14px',
            display: 'flex', alignItems: 'center', gap: '8px',
            cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
          }}
        >
          <Plus size={18} />
          <span>Add Location</span>
        </button>
      </div>

      {/* Stats Bar */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Total Locations', value: allLocations.length, color: '#60a5fa' },
          { label: 'Active', value: activeCount, color: '#34d399' },
          { label: 'Inactive', value: inactiveCount, color: '#9ca3af' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)',
            borderRadius: '10px', padding: '14px 20px', minWidth: '140px',
          }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>{stat.label}</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Location Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>Loading locations...</div>
      ) : allLocations.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '64px', color: 'var(--text-muted)',
          border: '1px dashed var(--border-color)', borderRadius: '14px',
        }}>
          <MapPin size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p style={{ fontSize: '16px', margin: 0 }}>No locations yet. Create the first one.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {allLocations.map(loc => (
            <div key={loc.id} style={{
              background: '#0f1019', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px', overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              opacity: loc.status === 'INACTIVE' ? 0.65 : 1,
              transition: 'opacity 0.2s',
            }}>
              {/* Top stripe */}
              <div style={{ height: '4px', background: loc.status === 'ACTIVE' ? 'linear-gradient(90deg,#10b981,#3b82f6)' : '#374151' }} />

              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <MapPin size={18} style={{ color: loc.status === 'ACTIVE' ? '#34d399' : '#6b7280' }} />
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{loc.name}</h3>
                  </div>
                  <span style={{
                    padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                    background: loc.status === 'ACTIVE' ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)',
                    color: loc.status === 'ACTIVE' ? '#34d399' : '#9ca3af',
                    border: `1px solid ${loc.status === 'ACTIVE' ? 'rgba(16,185,129,0.3)' : 'rgba(107,114,128,0.3)'}`,
                  }}>
                    {loc.status}
                  </span>
                </div>

                {loc.address && (
                  <p style={{ margin: '0 0 6px', fontSize: '13px', color: 'var(--text-muted)' }}>{loc.address}</p>
                )}
                {loc.timezone && (
                  <p style={{ margin: '0 0 10px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <Clock size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                    {loc.timezone}
                  </p>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  <Target size={13} style={{ color: '#60a5fa' }} />
                  <span>{loc._count?.targets ?? 0} targets linked</span>
                </div>
              </div>

              {/* Footer actions */}
              <div style={{
                padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px',
                background: 'rgba(255,255,255,0.02)',
              }}>
                <button
                  onClick={() => openEdit(loc)}
                  style={{
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff', padding: '6px 12px', borderRadius: '6px',
                    fontSize: '12px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                  }}
                >
                  <Edit2 size={13} /> Edit
                </button>
                <button
                  onClick={() => handleToggleStatus(loc)}
                  style={{
                    background: loc.status === 'ACTIVE' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                    border: `1px solid ${loc.status === 'ACTIVE' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                    color: loc.status === 'ACTIVE' ? '#f87171' : '#34d399',
                    padding: '6px 12px', borderRadius: '6px',
                    fontSize: '12px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                  }}
                >
                  {loc.status === 'ACTIVE' ? <><ToggleRight size={13} /> Deactivate</> : <><ToggleLeft size={13} /> Activate</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: '20px',
        }} onClick={() => setIsModalOpen(false)}>
          <div style={{
            background: '#141520', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '16px', width: '100%', maxWidth: '460px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)', overflow: 'hidden',
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <MapPin size={20} style={{ color: '#34d399' }} />
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                  {editingLoc ? 'Edit Location' : 'Create Location'}
                </h2>
              </div>
              <button onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={LABEL_STYLE}>Location Name *</label>
                <input
                  required autoFocus
                  type="text" placeholder="e.g. Mumbai, Delhi NCR"
                  value={formName} onChange={e => setFormName(e.target.value)}
                  style={FIELD_STYLE}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={LABEL_STYLE}>Address (optional)</label>
                <input
                  type="text" placeholder="e.g. Bandra Kurla Complex, Mumbai"
                  value={formAddress} onChange={e => setFormAddress(e.target.value)}
                  style={FIELD_STYLE}
                />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={LABEL_STYLE}>Timezone (optional)</label>
                <input
                  type="text" placeholder="e.g. Asia/Kolkata"
                  value={formTimezone} onChange={e => setFormTimezone(e.target.value)}
                  style={FIELD_STYLE}
                />
              </div>

              {error && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '8px', padding: '10px 14px', color: '#f87171',
                  fontSize: '13px', marginBottom: '16px',
                }}>{error}</div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)}
                  style={{
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff', padding: '10px 16px', borderRadius: '8px',
                    fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                  }}>Cancel</button>
                <button type="submit" disabled={saving}
                  style={{
                    background: 'linear-gradient(135deg,#10b981 0%,#059669 100%)',
                    color: '#fff', border: 'none', padding: '10px 20px',
                    borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    opacity: saving ? 0.7 : 1,
                  }}>
                  <Check size={15} />
                  {saving ? 'Saving...' : editingLoc ? 'Save Changes' : 'Create Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
