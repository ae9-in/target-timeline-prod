import React, { useCallback } from 'react';
import GridLayout from 'react-grid-layout';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useDashboard } from '../contexts/DashboardContext';
import { WidgetCard } from './WidgetCard';

import { LayoutDashboard, LayoutGrid } from 'lucide-react';

interface Props {
  containerWidth: number;
}

export const DashboardGrid: React.FC<Props> = ({ containerWidth }) => {
  const { activeDashboard, isEditMode, saveLayouts } = useDashboard();

  const onLayoutChange = useCallback((layouts: any) => {
    if (!activeDashboard || !isEditMode) return;
    const mapped = (layouts as any[])
      .filter(l => l.i !== '__placeholder__')
      .map(l => ({
        id: l.i,
        layout: { x: l.x, y: l.y, w: l.w, h: l.h },
      }));
    saveLayouts(mapped);
  }, [activeDashboard, isEditMode, saveLayouts]);

  if (!activeDashboard) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '400px', gap: '16px', color: 'var(--text-secondary)',
      }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          background: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--color-primary)',
          boxShadow: '0 8px 32px rgba(99, 102, 241, 0.05)',
        }}>
          <LayoutDashboard size={36} />
        </div>
        <div style={{ fontSize: '18px', fontWeight: 700, color: '#e5e7eb' }}>No Dashboard Selected</div>
        <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Create a new dashboard or select one from the list</div>
      </div>
    );
  }

  const visibleWidgets = activeDashboard.widgets.filter(w => !w.isHidden);

  if (visibleWidgets.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '400px', gap: '16px', color: 'var(--text-secondary)',
        border: '2px dashed rgba(255,255,255,0.06)',
        borderRadius: '16px', margin: '16px 0',
        background: 'rgba(255, 255, 255, 0.01)',
      }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          background: 'rgba(6, 182, 212, 0.08)',
          border: '1px solid rgba(6, 182, 212, 0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--color-accent)',
          boxShadow: '0 8px 32px rgba(6, 182, 212, 0.05)',
        }}>
          <LayoutGrid size={36} />
        </div>
        <div style={{ fontSize: '18px', fontWeight: 700, color: '#e5e7eb' }}>Empty Dashboard</div>
        <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          {isEditMode ? 'Add widgets from the panel on the right →' : 'Enable Edit Mode to add widgets'}
        </div>
      </div>
    );
  }

  const layouts: any[] = visibleWidgets.map(w => ({
    i: w.id,
    x: w.layout.x ?? 0,
    y: w.layout.y ?? 0,
    w: w.layout.w ?? 6,
    h: w.layout.h ?? 4,
    minW: 2,
    minH: 2,
    static: w.isLocked || !isEditMode,
  }));

  const ReactGridLayout = GridLayout as any;
  return (
    <ReactGridLayout
      className="dashboard-grid-layout"
      layout={layouts}
      cols={12}
      rowHeight={80}
      width={containerWidth || 1200}
      margin={[12, 12]}
      containerPadding={[0, 0]}
      onLayoutChange={onLayoutChange}
      isDraggable={isEditMode}
      isResizable={isEditMode}
      draggableHandle=".widget-drag-handle"
      resizeHandles={['se']}
      useCSSTransforms
    >
      {visibleWidgets.map(widget => (
        <div key={widget.id}>
          <WidgetCard widget={widget} />
        </div>
      ))}
    </ReactGridLayout>
  );
};
