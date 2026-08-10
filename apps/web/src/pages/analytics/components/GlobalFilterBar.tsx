import React from 'react';
import { Filter, X } from 'lucide-react';
import { useDashboard } from '../contexts/DashboardContext';
import { useLocations } from '../../../context/LocationContext';
import { useDepartments } from '../../../context/DepartmentContext';

export const GlobalFilterBar: React.FC = () => {
  const { filter, updateFilter, resetFilter, hasActiveFilters } = useDashboard();
  const { locations } = useLocations();
  const { departments } = useDepartments();

  const selectStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px', padding: '6px 28px 6px 10px', color: '#f3f4f6',
    fontSize: '12px', cursor: 'pointer', outline: 'none',
    fontFamily: 'inherit', appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
      padding: '10px 14px',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9ca3af', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}>
        <Filter size={13} />
        <span>Filters:</span>
      </div>

      {/* Department */}
      <select value={filter.department || ''} onChange={e => updateFilter({ department: e.target.value || undefined })} style={selectStyle}>
        <option value="">All Departments</option>
        {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
      </select>

      {/* Location */}
      <select value={filter.location || ''} onChange={e => updateFilter({ location: e.target.value || undefined })} style={selectStyle}>
        <option value="">All Locations</option>
        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>

      {/* RAG Status */}
      <select value={filter.ragStatus || ''} onChange={e => updateFilter({ ragStatus: e.target.value || undefined })} style={selectStyle}>
        <option value="">All Statuses</option>
        <option value="GREEN">● On Track</option>
        <option value="AMBER">● At Risk</option>
        <option value="RED">● Off Track</option>
      </select>

      {/* Date range */}
      <input
        type="date"
        value={filter.dateFrom || ''}
        onChange={e => updateFilter({ dateFrom: e.target.value || undefined })}
        style={{ ...selectStyle, backgroundImage: 'none', paddingRight: '10px', colorScheme: 'dark' }}
        title="From date"
      />
      <span style={{ color: '#6b7280', fontSize: '11px' }}>→</span>
      <input
        type="date"
        value={filter.dateTo || ''}
        onChange={e => updateFilter({ dateTo: e.target.value || undefined })}
        style={{ ...selectStyle, backgroundImage: 'none', paddingRight: '10px', colorScheme: 'dark' }}
        title="To date"
      />

      {/* Reset */}
      {hasActiveFilters && (
        <button onClick={resetFilter} style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          padding: '5px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
          background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: '11px', fontWeight: 600,
          fontFamily: 'inherit', transition: 'all 0.15s',
        }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
        >
          <X size={12} />
          Clear Filters
        </button>
      )}

      {hasActiveFilters && (
        <div style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 600, color: '#818cf8', background: 'rgba(99,102,241,0.1)', padding: '3px 8px', borderRadius: '9999px', border: '1px solid rgba(99,102,241,0.2)' }}>
          Filters Active
        </div>
      )}
    </div>
  );
};
