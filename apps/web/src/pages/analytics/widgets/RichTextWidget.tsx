import React from 'react';
import type { WidgetConfig } from '../types/dashboard.types';

interface Props { config: WidgetConfig; title: string; }

export const RichTextWidget: React.FC<Props> = ({ config }) => {
  const content = (config.content as string) || '';
  const align = (config.textAlign as string) || 'left';

  if (!content) {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '8px',
        color: '#4b5563', padding: '16px',
      }}>
        <div style={{ fontSize: '28px', opacity: 0.5 }}>📝</div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>No content yet</div>
        <div style={{ fontSize: '11px', color: '#374151', textAlign: 'center' }}>
          Click ⋮ → Configure to add text or notes
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100%', overflowY: 'auto', padding: '4px',
      fontSize: '13px', color: '#d1d5db', lineHeight: 1.7,
      textAlign: align as any,
      whiteSpace: 'pre-wrap',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {content}
    </div>
  );
};
