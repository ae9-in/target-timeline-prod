import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDepartments } from '../context/DepartmentContext';
import { useLocations } from '../context/LocationContext';
import ReactECharts from 'echarts-for-react';
import { MapPin, Building2 } from 'lucide-react';

export const DepartmentPerformance: React.FC = () => {
  const { api } = useAuth();
  const { departments } = useDepartments();
  const { locations } = useLocations();
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
        console.error('Error fetching targets for performance', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTargets();
  }, [api]);

  if (loading) {
    return <div className="text-center" style={{ padding: '40px' }}>Loading performance analytics...</div>;
  }

  // Filter departments and targets by selected location
  const scopedTargets = selectedLocationId === 'all'
    ? targets
    : targets.filter(t => t.locationId === selectedLocationId);

  const scopedDepts = selectedLocationId === 'all'
    ? departments
    : departments.filter(d => 
        d.locationId === selectedLocationId || 
        (!d.locationId && scopedTargets.some(t => t.vertical === d.name))
      );

  // Combine explicitly defined department names and any vertical names present on targets
  const departmentNames = scopedDepts.map((d) => d.name);
  const targetVerticals = Array.from(new Set(scopedTargets.map((t) => t.vertical).filter(Boolean)));
  const verticals = Array.from(new Set([...departmentNames, ...targetVerticals]));

  // Helper to get custom color for a vertical
  const getVerticalColor = (verticalName: string) => {
    const dept = departments.find(d => d.name.toLowerCase() === verticalName.toLowerCase());
    return dept?.color || 'var(--color-primary)';
  };
  
  const performanceData = verticals.map(v => {
    const vTargets = scopedTargets.filter(t => t.vertical === v);
    const total = vTargets.length;
    const green = vTargets.filter(t => t.ragStatus === 'GREEN').length;
    const amber = vTargets.filter(t => t.ragStatus === 'AMBER').length;
    const red = vTargets.filter(t => t.ragStatus === 'RED').length;
    
    // Average gap (percentage points behind expected)
    const totalGap = vTargets.reduce((sum, t) => sum + (t.gap || 0), 0);
    const avgGap = total > 0 ? (totalGap / total) * 100 : 0;
    
    // Average progress
    const totalProgress = vTargets.reduce((sum, t) => sum + (t.actualProgress || 0), 0);
    const avgProgress = total > 0 ? (totalProgress / total) * 100 : 0;

    return {
      vertical: v,
      total,
      green,
      amber,
      red,
      avgGap: Math.round(avgGap * 10) / 10,
      avgProgress: Math.round(avgProgress * 10) / 10
    };
  });

  // Chart 1: RAG Distribution Stacked Bar Chart
  const ragDistributionOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    legend: {
      data: ['On Track (Green)', 'At Risk (Amber)', 'Off Track (Red)'],
      textStyle: { color: '#9ca3af', fontFamily: 'Plus Jakarta Sans' },
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      top: '5%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      axisLabel: { color: '#9ca3af' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
    },
    yAxis: {
      type: 'category',
      data: verticals,
      axisLabel: { color: '#9ca3af', fontWeight: 'bold' },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } }
    },
    series: [
      {
        name: 'On Track (Green)',
        type: 'bar',
        stack: 'total',
        emphasis: { focus: 'series' },
        data: performanceData.map(d => d.green),
        itemStyle: { color: '#10b981' }
      },
      {
        name: 'At Risk (Amber)',
        type: 'bar',
        stack: 'total',
        emphasis: { focus: 'series' },
        data: performanceData.map(d => d.amber),
        itemStyle: { color: '#f59e0b' }
      },
      {
        name: 'Off Track (Red)',
        type: 'bar',
        stack: 'total',
        emphasis: { focus: 'series' },
        data: performanceData.map(d => d.red),
        itemStyle: { color: '#ef4444' }
      }
    ]
  };

  // Chart 2: Average Progress Gap Bar Chart
  const progressGapOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: '{b}: {c}% behind expected progress'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '5%',
      top: '5%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: verticals,
      axisLabel: { color: '#9ca3af', fontWeight: 'bold' },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#9ca3af', formatter: '{value}%' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
    },
    series: [
      {
        type: 'bar',
        data: performanceData.map(d => d.avgGap),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#ef4444' }, // Red at top (larger gap)
              { offset: 1, color: '#f59e0b' }  // Amber at bottom
            ]
          },
          borderRadius: [4, 4, 0, 0]
        },
        barWidth: '40%'
      }
    ]
  };

  return (
    <div className="content-container">
      {/* Location Filter */}
      {locations.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          marginBottom: '20px', flexWrap: 'wrap',
          padding: '10px 16px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
        }}>
          <MapPin size={15} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Location:</span>
          {[{ id: 'all', name: 'All Locations' }, ...locations].map(loc => (
            <button
              key={loc.id}
              onClick={() => setSelectedLocationId(loc.id)}
              style={{
                padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 500,
                cursor: 'pointer', border: 'none',
                background: selectedLocationId === loc.id ? 'var(--color-primary)' : 'rgba(255,255,255,0.06)',
                color: selectedLocationId === loc.id ? '#fff' : 'var(--text-muted)',
              }}
            >
              {loc.name}
            </button>
          ))}
        </div>
      )}
      {verticals.length === 0 ? (
        <div className="glass-card text-center" style={{ padding: '60px 40px', marginTop: '20px' }}>
          <Building2 size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px', opacity: 0.5 }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No Departments or Targets Found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '480px', margin: '0 auto' }}>
            It looks like there are no active departments or targets configured for this location yet. 
            Go to the Departments page to create them, or create targets under Target Tracker.
          </p>
        </div>
      ) : (
        <>
          {/* Grid of Department Stats Summary */}
          <div className="summary-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', marginBottom: '28px' }}>
            {performanceData.map(d => {
              const accentColor = getVerticalColor(d.vertical);
              return (
                <div key={d.vertical} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: `4px solid ${accentColor}` }}>
                  <h3 style={{ margin: 0, color: accentColor, fontSize: '18px', fontWeight: '800' }}>
                    {d.vertical}
                  </h3>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Total Targets:</span>
                    <span style={{ fontWeight: '700' }}>{d.total}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Avg. Progress:</span>
                    <span style={{ fontWeight: '700', color: 'var(--color-accent)' }}>{d.avgProgress}%</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Avg. Pace Gap:</span>
                    <span style={{ fontWeight: '700', color: d.avgGap > 10 ? 'var(--color-rag-red)' : d.avgGap > 0 ? 'var(--color-rag-amber)' : 'var(--color-rag-green)' }}>
                      {d.avgGap > 0 ? `-${d.avgGap}%` : 'On Track'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid-cols-2">
            {/* RAG Status Distribution Card */}
            <div className="glass-card">
              <h3 style={{ margin: '0 0 20px 0', fontSize: '15px', fontWeight: 'bold' }}>
                Targets Status Distribution
              </h3>
              <div style={{ height: '300px' }}>
                <ReactECharts option={ragDistributionOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>

            {/* Progress Pace Gap Card */}
            <div className="glass-card">
              <h3 style={{ margin: '0 0 20px 0', fontSize: '15px', fontWeight: 'bold' }}>
                Average Progress Gap (% Behind Expected)
              </h3>
              <div style={{ height: '300px' }}>
                <ReactECharts option={progressGapOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
