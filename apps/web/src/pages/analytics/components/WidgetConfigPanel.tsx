import React, { useState, useEffect } from 'react';
import { X, Settings2, Save } from 'lucide-react';
import { useDashboard } from '../contexts/DashboardContext';
import type { DashboardWidget, WidgetConfig } from '../types/dashboard.types';

interface Props {
  widget: DashboardWidget;
  onClose: () => void;
}

const METRIC_OPTIONS = [
  { value: 'total', label: 'Total Targets' },
  { value: 'completed', label: 'Completed' },
  { value: 'onTrack', label: 'On Track (Green)' },
  { value: 'atRisk', label: 'At Risk (Amber)' },
  { value: 'offTrack', label: 'Off Track (Red)' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'avgCompletionPct', label: 'Avg Completion %' },
  { value: 'successRate', label: 'Success Rate %' },
  { value: 'upcomingDeadlines', label: 'Due This Week' },
];

const COLOR_SCHEMES = [
  { value: 'indigo', label: 'Indigo', color: '#6366f1' },
  { value: 'blue', label: 'Blue', color: '#3b82f6' },
  { value: 'cyan', label: 'Cyan', color: '#06b6d4' },
  { value: 'green', label: 'Green', color: '#10b981' },
  { value: 'amber', label: 'Amber', color: '#f59e0b' },
  { value: 'red', label: 'Red', color: '#ef4444' },
  { value: 'violet', label: 'Violet', color: '#8b5cf6' },
];

const CHART_TYPES = [
  { value: 'stacked', label: 'Stacked Bar' },
  { value: 'grouped', label: 'Grouped Bar' },
  { value: 'horizontal', label: 'Horizontal Bar' },
];

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: '8px',
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#f3f4f6', fontSize: '12px', outline: 'none', fontFamily: 'inherit',
  cursor: 'pointer', appearance: 'none',
};

const inputStyle: React.CSSProperties = {
  ...selectStyle, appearance: undefined,
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 600, color: '#6b7280',
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px',
};

const fieldStyle: React.CSSProperties = { marginBottom: '16px' };

export const WidgetConfigPanel: React.FC<Props> = ({ widget, onClose }) => {
  const { updateWidgetConfig } = useDashboard();
  const [config, setConfig] = useState<WidgetConfig>({ ...widget.config });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setConfig({ ...widget.config });
  }, [widget.id]);

  const update = (key: string, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    await updateWidgetConfig(widget.id, config);
    setSaving(false);
    onClose();
  };

  const renderFields = () => {
    const type = widget.type;

    return (
      <>
        {/* KPI Card fields */}
        {type === 'kpi_card' && (
          <>
            <div style={fieldStyle}>
              <label style={labelStyle}>Metric</label>
              <select value={config.metric || 'total'} onChange={e => update('metric', e.target.value)} style={selectStyle}>
                {METRIC_OPTIONS.map(m => (
                  <option key={m.value} value={m.value} style={{ background: '#1e2030' }}>{m.label}</option>
                ))}
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Color Scheme</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {COLOR_SCHEMES.map(cs => (
                  <button key={cs.value} onClick={() => update('colorScheme', cs.value)} style={{
                    width: '32px', height: '32px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                    background: cs.color,
                    boxShadow: config.colorScheme === cs.value ? `0 0 0 3px rgba(255,255,255,0.5)` : 'none',
                    transition: 'all 0.15s',
                  }} title={cs.label} />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Bar chart fields */}
        {(type === 'bar_chart') && (
          <div style={fieldStyle}>
            <label style={labelStyle}>Chart Style</label>
            <select value={config.chartType || 'stacked'} onChange={e => update('chartType', e.target.value)} style={selectStyle}>
              {CHART_TYPES.map(ct => (
                <option key={ct.value} value={ct.value} style={{ background: '#1e2030' }}>{ct.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Show legend toggle */}
        {['rag_pie', 'bar_chart', 'line_chart', 'area_chart', 'donut_chart'].includes(type) && (
          <div style={fieldStyle}>
            <label style={labelStyle}>Legend</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[true, false].map(v => (
                <button key={String(v)} onClick={() => update('showLegend', v)} style={{
                  flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  background: (config.showLegend ?? true) === v ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                  color: (config.showLegend ?? true) === v ? '#818cf8' : '#6b7280',
                  fontSize: '12px', fontWeight: 600, fontFamily: 'inherit',
                  boxShadow: (config.showLegend ?? true) === v ? '0 0 0 1px rgba(99,102,241,0.3)' : 'none',
                  transition: 'all 0.15s',
                }}>
                  {v ? 'Show' : 'Hide'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Max items */}
        {['leaderboard', 'deadlines', 'activity_feed', 'drill_table', 'target_cards'].includes(type) && (
          <div style={fieldStyle}>
            <label style={labelStyle}>Max Items</label>
            <input
              type="number" min={3} max={50}
              value={config.maxItems || 10}
              onChange={e => update('maxItems', parseInt(e.target.value))}
              style={inputStyle}
            />
          </div>
        )}

        {/* Rich text content */}
        {type === 'rich_text' && (
          <>
            <div style={fieldStyle}>
              <label style={labelStyle}>Content</label>
              <textarea
                value={config.content || ''}
                onChange={e => update('content', e.target.value)}
                placeholder="Write your notes or context here..."
                rows={6}
                style={{
                  ...inputStyle, resize: 'vertical',
                  lineHeight: 1.6, verticalAlign: 'top',
                }}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Text Alignment</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['left', 'center', 'right'].map(align => (
                  <button key={align} onClick={() => update('textAlign', align)} style={{
                    flex: 1, padding: '7px', borderRadius: '7px', border: 'none', cursor: 'pointer',
                    background: (config.textAlign || 'left') === align ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                    color: (config.textAlign || 'left') === align ? '#818cf8' : '#6b7280',
                    fontSize: '11px', fontWeight: 700, fontFamily: 'inherit', textTransform: 'capitalize',
                    transition: 'all 0.15s',
                  }}>
                    {align}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Refresh interval */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Widget Refresh</label>
          <select value={config.refreshInterval || 0} onChange={e => update('refreshInterval', parseInt(e.target.value))} style={selectStyle}>
            <option value={0} style={{ background: '#1e2030' }}>Use dashboard setting</option>
            <option value={30000} style={{ background: '#1e2030' }}>Every 30s</option>
            <option value={60000} style={{ background: '#1e2030' }}>Every 1m</option>
            <option value={300000} style={{ background: '#1e2030' }}>Every 5m</option>
          </select>
        </div>
      </>
    );
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
      pointerEvents: 'none',
    }}>
      <div style={{
        width: '300px', height: '100vh', maxHeight: '100vh',
        background: 'linear-gradient(180deg, #13141f 0%, #0f1019 100%)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRight: 'none',
        boxShadow: '-16px 0 48px rgba(0,0,0,0.4)',
        display: 'flex', flexDirection: 'column',
        pointerEvents: 'all',
        animation: 'slideInRight 0.2s cubic-bezier(0.4,0,0.2,1)',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'linear-gradient(180deg, rgba(99,102,241,0.06), transparent)',
          flexShrink: 0,
        }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Settings2 size={16} style={{ color: '#818cf8' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#f3f4f6' }}>Configure Widget</div>
            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {widget.title}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '7px', cursor: 'pointer', color: '#6b7280',
            padding: '6px', display: 'flex',
          }}>
            <X size={14} />
          </button>
        </div>

        {/* Fields */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
          {renderFields()}
        </div>

        {/* Save */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: '100%', padding: '10px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none',
              color: '#fff', cursor: saving ? 'wait' : 'pointer',
              fontSize: '13px', fontWeight: 700, fontFamily: 'inherit',
              boxShadow: '0 0 16px rgba(99,102,241,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              transition: 'all 0.15s', opacity: saving ? 0.7 : 1,
            }}
          >
            <Save size={14} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
