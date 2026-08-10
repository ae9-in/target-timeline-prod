import React, { useEffect, useRef } from 'react';
import { useDashboard } from '../contexts/DashboardContext';

interface Props { config: any; title: string; }

export const SpeedometerWidget: React.FC<Props> = () => {
  const { analyticsData } = useDashboard();
  const { kpis } = analyticsData;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const value = kpis?.avgCompletionPct ?? 0;
  const score = Math.round(value);
  const pct = Math.min(score, 100) / 100;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H * 0.72;
    const R = Math.min(W, H) * 0.42;

    ctx.clearRect(0, 0, W, H);

    // Background arc
    ctx.beginPath();
    ctx.arc(cx, cy, R, Math.PI, 2 * Math.PI);
    ctx.lineWidth = 18;
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Color gradient arc
    const startAngle = Math.PI;
    const endAngle = startAngle + Math.PI * pct;

    const grad = ctx.createLinearGradient(cx - R, cy, cx + R, cy);
    grad.addColorStop(0, '#ef4444');
    grad.addColorStop(0.45, '#f59e0b');
    grad.addColorStop(1, '#10b981');

    ctx.beginPath();
    ctx.arc(cx, cy, R, startAngle, endAngle);
    ctx.lineWidth = 18;
    ctx.strokeStyle = grad;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Tick marks
    for (let i = 0; i <= 10; i++) {
      const tickAngle = Math.PI + (Math.PI * i) / 10;
      const inner = R - 26;
      const outer = R - 10;
      const cos = Math.cos(tickAngle);
      const sin = Math.sin(tickAngle);
      ctx.beginPath();
      ctx.moveTo(cx + cos * inner, cy + sin * inner);
      ctx.lineTo(cx + cos * outer, cy + sin * outer);
      ctx.lineWidth = i % 5 === 0 ? 2 : 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.stroke();
    }

    // Needle
    const needleAngle = Math.PI + Math.PI * pct;
    const needleLen = R - 28;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(needleAngle) * needleLen, cy + Math.sin(needleAngle) * needleLen);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Needle pivot
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#f3f4f6';
    ctx.fill();
  }, [value, pct]);

  const getLabel = () => {
    if (score >= 75) return { text: 'Excellent', color: '#10b981' };
    if (score >= 50) return { text: 'Good', color: '#f59e0b' };
    return { text: 'Needs Work', color: '#ef4444' };
  };

  const status = getLabel();

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
      <canvas ref={canvasRef} width={200} height={130} style={{ maxWidth: '100%', maxHeight: '55%' }} />
      <div style={{ fontSize: '32px', fontWeight: 800, color: '#f3f4f6', lineHeight: 1, marginTop: '-8px' }}>
        {kpis ? `${score}%` : '—'}
      </div>
      <div style={{ fontSize: '12px', fontWeight: 700, color: status.color }}>
        {status.text}
      </div>
      <div style={{ fontSize: '11px', color: '#6b7280' }}>Average Completion</div>
    </div>
  );
};
