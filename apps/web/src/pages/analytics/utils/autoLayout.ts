import type { DashboardWidget, WidgetLayout } from '../types/dashboard.types';

/**
 * Smart greedy bin-packing auto-layout.
 * Places widgets left-to-right, top-to-bottom, keeping their width
 * but recalculating y positions to eliminate gaps.
 */
export function autoLayout(widgets: DashboardWidget[]): Array<{ id: string; layout: WidgetLayout }> {
  const COLS = 12;
  // grid[row] = set of occupied columns
  const grid: boolean[][] = [];

  function canPlace(x: number, y: number, w: number, h: number): boolean {
    for (let row = y; row < y + h; row++) {
      for (let col = x; col < x + w; col++) {
        if (grid[row]?.[col]) return false;
      }
    }
    return true;
  }

  function place(x: number, y: number, w: number, h: number) {
    for (let row = y; row < y + h; row++) {
      if (!grid[row]) grid[row] = new Array(COLS).fill(false);
      for (let col = x; col < x + w; col++) {
        grid[row][col] = true;
      }
    }
  }

  function findPosition(w: number, h: number): { x: number; y: number } {
    for (let y = 0; y < 100; y++) {
      for (let x = 0; x <= COLS - w; x++) {
        if (canPlace(x, y, w, h)) return { x, y };
      }
    }
    return { x: 0, y: 0 };
  }

  // Sort by original order (y*100 + x)
  const sorted = [...widgets].sort((a, b) => {
    return (a.layout.y * 100 + a.layout.x) - (b.layout.y * 100 + b.layout.x);
  });

  return sorted.map(widget => {
    const w = Math.min(widget.layout.w ?? 6, COLS);
    const h = widget.layout.h ?? 4;
    const { x, y } = findPosition(w, h);
    place(x, y, w, h);
    return { id: widget.id, layout: { x, y, w, h } };
  });
}
