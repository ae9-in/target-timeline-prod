import React, { useState, useRef, useEffect } from 'react';
import { DashboardProvider } from './contexts/DashboardContext';
import { DashboardBuilder } from './components/DashboardBuilder';
import { DashboardGrid } from './components/DashboardGrid';
import { DashboardSidebar } from './components/DashboardSidebar';
import { GlobalFilterBar } from './components/GlobalFilterBar';
import { useDashboard } from './contexts/DashboardContext';
import { Analytics } from '../Analytics';
import { BarChart3, LayoutDashboard, Info } from 'lucide-react';

// ─── Inner builder shell (needs context) ──────────────────────────────────────
const DashboardBuilderShell: React.FC = () => {
  const { isEditMode, analyticsData } = useDashboard();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [containerWidth, setContainerWidth] = useState(1200);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width - (sidebarOpen ? 272 : 0));
      }
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [sidebarOpen]);

  // Recalculate width when sidebar opens/closes
  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth - (sidebarOpen ? 272 : 0));
    }
  }, [sidebarOpen]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
      {/* Builder Toolbar */}
      <div style={{ background: '#0f1019', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '10px 14px' }}>
        <DashboardBuilder onAddWidget={() => setSidebarOpen(true)} />
      </div>

      {/* Global Filter Bar */}
      <GlobalFilterBar />

      {/* Edit mode hint */}
      {isEditMode && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 14px', borderRadius: '8px',
          background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)',
          fontSize: '12px', color: '#818cf8',
        }}>
          <Info size={14} style={{ color: '#818cf8', flexShrink: 0 }} />
          <span><strong>Edit Mode:</strong> Drag widgets to reorder, resize from corner, use the ⋮ menu for more options, or add new widgets with the button above.</span>
        </div>
      )}

      {/* Main content area */}
      <div ref={containerRef} style={{ display: 'flex', gap: '12px', flex: 1, minHeight: 0 }}>
        {/* Grid */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <DashboardGrid containerWidth={containerWidth} />
        </div>

        {/* Widget Picker Sidebar */}
        {sidebarOpen && (
          <div style={{ height: 'fit-content', position: 'sticky', top: '70px' }}>
            <DashboardSidebar onClose={() => setSidebarOpen(false)} />
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Page (wraps with provider) ──────────────────────────────────────────
export const AnalyticsDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'builder'>('builder');

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: BarChart3, desc: 'Location & Drill-Down Analytics' },
    { id: 'builder' as const, label: 'Dashboard Builder', icon: LayoutDashboard, desc: 'Enterprise BI Dashboard' },
  ];

  return (
    <div className="content-container" style={{ gap: '16px' }}>
      {/* Tab Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '4px',
        background: '#0f1019',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '12px', padding: '6px',
      }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '10px 16px', borderRadius: '9px', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: '13px', fontWeight: 700, transition: 'all 0.2s',
              background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
              color: isActive ? '#818cf8' : '#9ca3af',
              boxShadow: isActive ? 'inset 0 0 12px rgba(99,102,241,0.06), 0 0 0 1px rgba(99,102,241,0.2)' : 'none',
            }}>
              <Icon size={16} />
              <span>{tab.label}</span>
              {isActive && (
                <span style={{ fontSize: '10px', background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', padding: '1px 6px', borderRadius: '9999px', fontWeight: 600 }}>
                  {tab.desc}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <Analytics />
      )}

      {activeTab === 'builder' && (
        <DashboardProvider>
          <DashboardBuilderShell />
        </DashboardProvider>
      )}
    </div>
  );
};
