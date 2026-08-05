import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocations } from '../context/LocationContext';
import { useDepartments } from '../context/DepartmentContext';
import ReactECharts from 'echarts-for-react';
import { MapPin, BarChart3 } from 'lucide-react';

export const Analytics: React.FC = () => {
  const { api } = useAuth();
  const { locations, loading: locLoading } = useLocations();
  const { departments } = useDepartments();
  const [targets, setTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');

  useEffect(() => {
    const fetchTargets = async () => {
      try {
        setLoading(true);
        const res = await api.get('/targets');
        setTargets(res.data);
      } catch (err) {
        console.error('Error fetching targets for analytics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTargets();
  }, [api]);

  if (loading || locLoading) {
    return <div className="text-center" style={{ padding: '40px' }}>Loading analytics...</div>;
  }

  // Scope targets to selected location (or all)
  const scopedTargets = selectedLocationId === 'all'
    ? targets
    : targets.filter(t => t.locationId === selectedLocationId);

  // For per-location view: departments in this location
  const scopedDepts = selectedLocationId === 'all'
    ? departments
    : departments.filter(d => d.locationId === selectedLocationId);

  // Overall stats
  const greenCount = scopedTargets.filter(t => t.ragStatus === 'GREEN').length;
  const amberCount = scopedTargets.filter(t => t.ragStatus === 'AMBER').length;
  const redCount = scopedTargets.filter(t => t.ragStatus === 'RED').length;
  const totalCount = scopedTargets.length;
  const totalCompletion = scopedTargets.reduce((sum, t) => sum + (t.actualProgress || 0), 0);
  const avgCompletion = totalCount > 0 ? Math.min(100, Math.round((totalCompletion / totalCount) * 100)) : 0;

  // RAG Pie
  const ragShareOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: '{a} <br/>{b} : {c} ({d}%)' },
    legend: { textStyle: { color: '#9ca3af', fontFamily: 'Plus Jakarta Sans' }, bottom: '0%' },
    series: [{
      name: 'RAG Share', type: 'pie', radius: ['45%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 8, borderColor: 'var(--bg-surface)', borderWidth: 2 },
      label: { show: false, position: 'center' },
      emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold', color: '#f3f4f6' } },
      labelLine: { show: false },
      data: [
        { value: greenCount, name: 'Green (On Track)', itemStyle: { color: '#10b981' } },
        { value: amberCount, name: 'Amber (At Risk)', itemStyle: { color: '#f59e0b' } },
        { value: redCount, name: 'Red (Off Track)', itemStyle: { color: '#ef4444' } },
      ],
    }],
  };

  // Completion Gauge
  const completionGaugeOption = {
    backgroundColor: 'transparent',
    series: [{
      type: 'gauge', startAngle: 180, endAngle: 0, center: ['50%', '75%'], radius: '90%',
      min: 0, max: 100, splitNumber: 5,
      axisLine: { lineStyle: { width: 12, color: [[0.3, '#ef4444'], [0.7, '#f59e0b'], [1, '#10b981']] } },
      pointer: { icon: 'path://M12.8,29.5C12.2,30,11,30,10.4,29.5L1.3,21.5c-0.8-0.7-0.8-2,0-2.7l9.1-8c0.6-0.5,1.8-0.5,2.4,0l0.1,0.1c0.6,0.5,0.6,1.4,0,1.9L5.4,19.2l12.7,11.2c0.6,0.5,0.6,1.4,0,1.9L12.8,29.5z', length: '75%', width: 8, offsetCenter: [0, 5], itemStyle: { color: 'auto' } },
      axisTick: { length: 6, lineStyle: { color: 'auto', width: 2 } },
      splitLine: { length: 12, lineStyle: { color: 'auto', width: 4 } },
      axisLabel: { color: '#9ca3af', fontSize: 12, distance: -40, rotate: 'tangential', formatter: (v: number) => v === 0 ? '0%' : v === 50 ? '50%' : v === 100 ? '100%' : '' },
      title: { offsetCenter: [0, '-20%'], fontSize: 13, color: '#9ca3af', fontWeight: 600 },
      detail: { fontSize: 32, offsetCenter: [0, '-5%'], valueAnimation: true, formatter: '{value}%', color: '#f3f4f6', fontWeight: 800 },
      data: [{ value: avgCompletion, name: 'Average Progress' }],
    }],
  };

  // All-Locations comparison chart
  const allLocationComparisonOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['On Track', 'At Risk', 'Off Track'], textStyle: { color: '#9ca3af' }, bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '12%', top: '5%', containLabel: true },
    xAxis: { type: 'category', data: [...locations.map(l => l.name), 'Unassigned'], axisLabel: { color: '#9ca3af' } },
    yAxis: { type: 'value', axisLabel: { color: '#9ca3af' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } } },
    series: [
      {
        name: 'On Track', type: 'bar', stack: 'total', itemStyle: { color: '#10b981' },
        data: [...locations.map(l => targets.filter(t => t.locationId === l.id && t.ragStatus === 'GREEN').length),
          targets.filter(t => !t.locationId && t.ragStatus === 'GREEN').length],
      },
      {
        name: 'At Risk', type: 'bar', stack: 'total', itemStyle: { color: '#f59e0b' },
        data: [...locations.map(l => targets.filter(t => t.locationId === l.id && t.ragStatus === 'AMBER').length),
          targets.filter(t => !t.locationId && t.ragStatus === 'AMBER').length],
      },
      {
        name: 'Off Track', type: 'bar', stack: 'total', itemStyle: { color: '#ef4444' },
        data: [...locations.map(l => targets.filter(t => t.locationId === l.id && t.ragStatus === 'RED').length),
          targets.filter(t => !t.locationId && t.ragStatus === 'RED').length],
      },
    ],
  };

  const selectedLocation = locations.find(l => l.id === selectedLocationId);

  return (
    <div className="content-container">
      {/* Location Tab Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        marginBottom: '24px', flexWrap: 'wrap',
        padding: '12px 16px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
      }}>
        <MapPin size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginRight: '4px' }}>Location:</span>
        {[{ id: 'all', name: 'All Locations' }, ...locations].map(loc => (
          <button
            key={loc.id}
            onClick={() => setSelectedLocationId(loc.id)}
            style={{
              padding: '5px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 500,
              cursor: 'pointer', border: 'none', transition: 'all 0.15s',
              background: selectedLocationId === loc.id
                ? 'linear-gradient(135deg, #10b981, #3b82f6)'
                : 'rgba(255,255,255,0.06)',
              color: selectedLocationId === loc.id ? '#fff' : 'var(--text-muted)',
              boxShadow: selectedLocationId === loc.id ? '0 2px 8px rgba(16,185,129,0.3)' : 'none',
            }}
          >
            {loc.name}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="summary-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '20px' }}>
        <div className="glass-card text-center">
          <span className="summary-label">Green Ratio</span>
          <span className="summary-value" style={{ color: 'var(--color-rag-green)', marginTop: '8px' }}>
            {totalCount > 0 ? Math.round((greenCount / totalCount) * 100) : 0}%
          </span>
        </div>
        <div className="glass-card text-center">
          <span className="summary-label">Amber Ratio</span>
          <span className="summary-value" style={{ color: 'var(--color-rag-amber)', marginTop: '8px' }}>
            {totalCount > 0 ? Math.round((amberCount / totalCount) * 100) : 0}%
          </span>
        </div>
        <div className="glass-card text-center">
          <span className="summary-label">Red Ratio</span>
          <span className="summary-value" style={{ color: 'var(--color-rag-red)', marginTop: '8px' }}>
            {totalCount > 0 ? Math.round((redCount / totalCount) * 100) : 0}%
          </span>
        </div>
        <div className="glass-card text-center">
          <span className="summary-label">Active Gaps</span>
          <span className="summary-value" style={{ color: 'var(--color-accent)', marginTop: '8px' }}>
            {scopedTargets.filter(t => t.gap > 0).length} Targets
          </span>
        </div>
      </div>

      {selectedLocationId === 'all' ? (
        // ALL LOCATIONS: comparison chart
        <div>
          <div className="glass-card">
            <h3 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={16} style={{ color: '#60a5fa' }} />
              Location-wise Target Status Comparison
            </h3>
            <div style={{ height: '300px' }}>
              <ReactECharts option={allLocationComparisonOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>

          <div className="grid-cols-2" style={{ marginTop: '20px' }}>
            <div className="glass-card">
              <h3 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: 'bold' }}>Company-Wide RAG Share</h3>
              <div style={{ height: '280px' }}>
                <ReactECharts option={ragShareOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
            <div className="glass-card">
              <h3 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: 'bold' }}>Company-Wide Completion</h3>
              <div style={{ height: '280px' }}>
                <ReactECharts option={completionGaugeOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        // PER-LOCATION: scoped charts + department breakdown
        <div>
          <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={16} style={{ color: '#34d399' }} />
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
              {selectedLocation?.name} — Analytics
            </h2>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              ({totalCount} targets · {scopedDepts.length} departments)
            </span>
          </div>

          <div className="grid-cols-2">
            <div className="glass-card">
              <h3 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: 'bold' }}>Target Portfolio Health Share</h3>
              <div style={{ height: '280px' }}>
                <ReactECharts option={ragShareOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
            <div className="glass-card">
              <h3 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: 'bold' }}>Target Completion Performance</h3>
              <div style={{ height: '280px' }}>
                <ReactECharts option={completionGaugeOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          </div>

          {/* Department breakdown for this location */}
          {scopedDepts.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>
                DEPARTMENTS IN {selectedLocation?.name?.toUpperCase()}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                {scopedDepts.map(dept => {
                  const dTargets = scopedTargets.filter(t => t.vertical === dept.name);
                  const dGreen = dTargets.filter(t => t.ragStatus === 'GREEN').length;
                  const dAmber = dTargets.filter(t => t.ragStatus === 'AMBER').length;
                  const dRed = dTargets.filter(t => t.ragStatus === 'RED').length;
                  const dTotal = dTargets.length;
                  const dProg = dTotal > 0 ? Math.min(100, Math.round(dTargets.reduce((s, t) => s + (t.actualProgress || 0), 0) / dTotal * 100)) : 0;
                  return (
                    <div key={dept.id} style={{
                      background: '#0f1019', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px', overflow: 'hidden',
                    }}>
                      <div style={{ height: '4px', background: dept.color || 'var(--color-primary)' }} />
                      <div style={{ padding: '16px' }}>
                        <div style={{ fontWeight: 700, marginBottom: '8px', fontSize: '15px' }}>{dept.name}</div>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                          <span style={{ color: '#10b981' }}>●{dGreen} Green</span>
                          <span style={{ color: '#f59e0b' }}>●{dAmber} Amber</span>
                          <span style={{ color: '#ef4444' }}>●{dRed} Red</span>
                        </div>
                        <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                          Avg Progress: <strong style={{ color: '#60a5fa' }}>{dProg}%</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {totalCount === 0 && (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', opacity: 0.6 }}>
              No targets found for {selectedLocation?.name}.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
