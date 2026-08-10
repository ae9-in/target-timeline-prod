import React, { useMemo, useState } from 'react';
import { useDashboard } from '../contexts/DashboardContext';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronUp, ChevronDown } from 'lucide-react';

interface Props { config: any; title: string; }

type SortKey = 'name' | 'owner' | 'vertical' | 'ragStatus' | 'actualProgress' | 'deadline';

export const DrillDownTableWidget: React.FC<Props> = ({ config }) => {
  const { analyticsData, applyFilter } = useDashboard();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'deadline', dir: 'asc' });
  const maxItems = config.maxItems || 20;

  const data = useMemo(() => {
    let targets = applyFilter(analyticsData.targets);
    if (search) {
      const q = search.toLowerCase();
      targets = targets.filter((t: any) =>
        t.name?.toLowerCase().includes(q) ||
        t.owner?.toLowerCase().includes(q) ||
        t.vertical?.toLowerCase().includes(q)
      );
    }
    targets = targets.sort((a: any, b: any) => {
      let av = a[sort.key], bv = b[sort.key];
      if (sort.key === 'deadline') { av = new Date(av).getTime(); bv = new Date(bv).getTime(); }
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return targets.slice(0, maxItems);
  }, [analyticsData.targets, applyFilter, search, sort, maxItems]);

  const toggleSort = (key: SortKey) => {
    setSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sort.key !== k) return <span style={{ opacity: 0.3 }}>↕</span>;
    return sort.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  const RAG_COLORS: Record<string, string> = { GREEN: '#10b981', AMBER: '#f59e0b', RED: '#ef4444' };

  const TH = ({ children, k }: { children: React.ReactNode; k: SortKey }) => (
    <th onClick={() => toggleSort(k)} style={{
      padding: '8px 10px', fontSize: '10px', fontWeight: 700, color: '#6b7280',
      textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left',
      background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)',
      cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {children} <SortIcon k={k} />
      </span>
    </th>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Search */}
      <div style={{ position: 'relative' }}>
        <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search targets..."
          style={{
            width: '100%', padding: '6px 10px 6px 26px', borderRadius: '6px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            color: '#f3f4f6', fontSize: '12px', outline: 'none', fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <tr>
              <TH k="name">Target</TH>
              <TH k="owner">Owner</TH>
              <TH k="vertical">Dept</TH>
              <TH k="ragStatus">Status</TH>
              <TH k="actualProgress">Progress</TH>
              <TH k="deadline">Deadline</TH>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: '#6b7280', fontSize: '12px' }}>No targets found</td></tr>
            ) : data.map((t: any) => (
              <tr key={t.id} onClick={() => navigate(`/targets/${t.id}`)} style={{ cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '8px 10px', color: '#e5e7eb', fontWeight: 600, maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  {t.name}
                </td>
                <td style={{ padding: '8px 10px', color: '#9ca3af', borderBottom: '1px solid rgba(255,255,255,0.04)', whiteSpace: 'nowrap' }}>{t.owner}</td>
                <td style={{ padding: '8px 10px', color: '#9ca3af', borderBottom: '1px solid rgba(255,255,255,0.04)', whiteSpace: 'nowrap' }}>{t.vertical}</td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: 700,
                    color: RAG_COLORS[t.ragStatus] || '#6b7280',
                    background: `${RAG_COLORS[t.ragStatus] || '#6b7280'}15`,
                    border: `1px solid ${RAG_COLORS[t.ragStatus] || '#6b7280'}30`,
                  }}>
                    {t.ragStatus}
                  </span>
                </td>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)', minWidth: '80px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ flex: 1, height: '4px', borderRadius: '9999px', background: 'rgba(255,255,255,0.06)' }}>
                      <div style={{ height: '100%', borderRadius: '9999px', width: `${Math.round((t.actualProgress || 0) * 100)}%`, background: '#6366f1' }} />
                    </div>
                    <span style={{ fontSize: '11px', color: '#9ca3af', flexShrink: 0 }}>{Math.round((t.actualProgress || 0) * 100)}%</span>
                  </div>
                </td>
                <td style={{ padding: '8px 10px', color: '#9ca3af', borderBottom: '1px solid rgba(255,255,255,0.04)', whiteSpace: 'nowrap', fontSize: '11px' }}>
                  {new Date(t.deadline).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
