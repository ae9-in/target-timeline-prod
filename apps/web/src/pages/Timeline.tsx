import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toPng } from 'html-to-image';
import {
  Layers, GitBranch,
  BookMarked, Download, FileText, Search,
  RotateCcw, SlidersHorizontal, Calendar,
  ChevronDown, ChevronRight, User as UserIcon,
  Info, Maximize, Minimize, Plus, Trash2, Copy, Edit2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGanttData } from '../hooks/useGanttData';
import { targetsToCSV } from '../utils/gantt-transform';
import type { GanttTarget } from '../utils/gantt-transform';

// ─── Constants ────────────────────────────────────────────────────────────────
const ROW_HEIGHT = 44;

type GroupBy = 'none' | 'vertical' | 'owner';
type FilterRAG = 'ALL' | 'GREEN' | 'AMBER' | 'RED';
type ViewMode = 'Day' | 'Week' | 'Month' | 'Quarter' | 'Year';

interface GanttRow {
  type: 'group' | 'task' | 'ghost';
  id: string;
  label: string;
  target?: GanttTarget;
  progress?: number;
  startDate?: string;
  deadline?: string;
  groupId?: string; // Links ghost rows to their parent group vertical/owner value
}

// ─── Cell Editor Component ────────────────────────────────────────────────────
interface GridCellProps {
  target: GanttTarget;
  colId: string;
  value: string;
  hasAccess: boolean;
  onSave: (targetId: string, colId: string, newValue: any) => Promise<void>;
}

const GridCell: React.FC<GridCellProps> = ({ target, colId, value, hasAccess, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);

  useEffect(() => {
    setVal(value);
  }, [value]);

  const handleDoubleClick = () => {
    if (hasAccess && colId !== 'rag') {
      setEditing(true);
    }
  };

  const handleBlur = async () => {
    setEditing(false);
    if (val !== value) {
      await onSave(target.id, colId, val);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setVal(value);
      setEditing(false);
    }
  };

  if (editing) {
    if (colId === 'start' || colId === 'deadline') {
      const dateVal = val ? new Date(val).toISOString().split('T')[0] : '';
      return (
        <input
          type="date"
          className="gantt-cell-input"
          value={dateVal}
          onChange={(e) => setVal(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      );
    }
    if (colId === 'progress') {
      return (
        <input
          type="number"
          min="0"
          max="100"
          className="gantt-cell-input"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      );
    }
    return (
      <input
        type="text"
        className="gantt-cell-input"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoFocus
      />
    );
  }

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className={`gantt-grid-cell-content ${hasAccess && colId !== 'rag' ? 'editable' : ''}`}
      title={hasAccess && colId !== 'rag' ? "Double click to edit cell" : undefined}
    >
      {colId === 'start' || colId === 'deadline' ? (
        value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '-'
      ) : colId === 'progress' ? (
        `${value}%`
      ) : (
        value
      )}
    </div>
  );
};

// ─── Main Timeline Component ──────────────────────────────────────────────────
export const Timeline: React.FC = () => {
  const { api, user } = useAuth();
  const navigate = useNavigate();

  // Settings / filters
  const [viewMode, setViewMode] = useState<ViewMode>('Week');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [showCritical, setShowCritical] = useState(true);
  const [showBaseline, setShowBaseline] = useState(false);
  const [filterRAG, setFilterRAG] = useState<FilterRAG>('ALL');
  const [filterMilestone, setFilterMilestone] = useState(false);
  const [filterCriticalOnly, setFilterCriticalOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    targetId?: string;
    groupId?: string;
    clickedDate?: Date;
  } | null>(null);

  // Quick Create Popover State
  const [quickCreate, setQuickCreate] = useState<{
    startDate: Date;
    deadline: Date;
    groupId?: string;
    x: number;
    y: number;
    isMilestone?: boolean;
  } | null>(null);

  // Quick Create Fields
  const [qcName, setQcName] = useState('');
  const [qcOwner, setQcOwner] = useState(user?.name || '');
  const [qcVertical, setQcVertical] = useState('Sales');

  // Drag-to-create state
  const [dragCreate, setDragCreate] = useState<{
    startX: number;
    currentX: number;
    rowIndex: number;
    groupId?: string;
  } | null>(null);

  // Add dependency creation state
  const [dependencySourceId, setDependencySourceId] = useState<string | null>(null);

  // Copy paste target clip state
  const [copiedTarget, setCopiedTarget] = useState<GanttTarget | null>(null);

  // Canvas Hover guide line X
  const [hoverGuideX, setHoverGuideX] = useState<number | null>(null);

  // Column Widths (state + localStorage cache)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('gantt_column_widths');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return { name: 200, owner: 100, start: 80, deadline: 80, progress: 80, rag: 70 };
  });

  const columns = useMemo(() => [
    { id: 'name', label: 'Task Name' },
    { id: 'owner', label: 'Owner' },
    { id: 'start', label: 'Start' },
    { id: 'deadline', label: 'Deadline' },
    { id: 'progress', label: 'Progress' },
    { id: 'rag', label: 'RAG' }
  ], []);

  // Responsive / Condensation of columns below 1024px
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showCondensedGrid = windowWidth < 1024;

  const visibleColumns = useMemo(() => {
    if (showCondensedGrid) {
      return columns.filter(col => col.id !== 'owner' && col.id !== 'progress');
    }
    return columns;
  }, [showCondensedGrid, columns]);

  // Full Screen State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const ganttPageRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      ganttPageRef.current?.requestFullscreen().catch(err => {
        console.error(`Error entering fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      setTimeout(updateGhostRows, 150);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Collapse status of groups
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const handleGroupToggle = (groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  // Drag-to-resize grid column headers
  const resizingColRef = useRef<string | null>(null);
  const resizingWidthRef = useRef<number>(0);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, colId: string) => {
    e.preventDefault();
    resizingColRef.current = colId;
    resizingWidthRef.current = columnWidths[colId];

    const startX = e.clientX;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingColRef.current) return;
      const dx = moveEvent.clientX - startX;
      const newWidth = Math.max(50, resizingWidthRef.current + dx);
      setColumnWidths(prev => ({
        ...prev,
        [resizingColRef.current!]: newWidth
      }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      resizingColRef.current = null;
      localStorage.setItem('gantt_column_widths', JSON.stringify(columnWidths));
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [columnWidths]);

  // Scroll Sync Refs
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyHorizontalScrollRef = useRef<HTMLDivElement>(null);

  // Hook to pull data
  const { targets, criticalIds, loading, error, refresh } = useGanttData(api);

  // Local copy of targets for optimistic updates
  const [localTargets, setLocalTargets] = useState<GanttTarget[]>([]);

  useEffect(() => {
    if (targets) {
      setLocalTargets(targets);
    }
  }, [targets]);

  // Sync scroll left
  const handleHorizontalScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  }, []);

  // ── Date Scale Calculations ─────────────────────────────────────────────────
  const timelineDates = useMemo(() => {
    if (localTargets.length === 0) {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 2, 1);
      return { start, end };
    }

    const starts = localTargets.map(t => new Date(t.startDate).getTime());
    const ends = localTargets.map(t => new Date(t.deadline).getTime());

    const minStart = new Date(Math.min(...starts));
    const maxEnd = new Date(Math.max(...ends));

    // Pad 1 month to start and end
    const start = new Date(minStart.getFullYear(), minStart.getMonth() - 1, 1);
    const end = new Date(maxEnd.getFullYear(), maxEnd.getMonth() + 2, 1);

    return { start, end };
  }, [localTargets]);

  const totalDays = useMemo(() => {
    const diff = timelineDates.end.getTime() - timelineDates.start.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [timelineDates]);

  const pixelsPerDay = useMemo(() => {
    switch (viewMode) {
      case 'Day': return 32;
      case 'Week': return 8;     // Week is 56px
      case 'Month': return 2.5;  // Month is 75px
      case 'Quarter': return 0.8; // Quarter is 72px
      case 'Year': return 0.2;   // Year is 73px
      default: return 8;
    }
  }, [viewMode]);

  const totalTimelineWidth = useMemo(() => {
    return totalDays * pixelsPerDay;
  }, [totalDays, pixelsPerDay]);

  const dateToX = useCallback((d: Date) => {
    const diff = d.getTime() - timelineDates.start.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    return days * pixelsPerDay;
  }, [timelineDates, pixelsPerDay]);

  const xToDate = useCallback((x: number) => {
    const days = x / pixelsPerDay;
    const ms = days * 24 * 60 * 60 * 1000;
    return new Date(timelineDates.start.getTime() + ms);
  }, [timelineDates, pixelsPerDay]);

  // Today marker
  const todayX = useMemo(() => {
    const today = new Date();
    if (today < timelineDates.start || today > timelineDates.end) return null;
    return dateToX(today);
  }, [timelineDates, dateToX]);

  // Weekend Bands
  const weekendBands = useMemo(() => {
    const bands: Array<{ left: number; width: number }> = [];
    if (viewMode === 'Year' || viewMode === 'Quarter') return bands;

    const current = new Date(timelineDates.start);
    while (current < timelineDates.end) {
      const day = current.getDay();
      if (day === 6 || day === 0) { // Saturday or Sunday
        const left = dateToX(current);
        const next = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1);
        const width = dateToX(next) - left;
        bands.push({ left, width });
      }
      current.setDate(current.getDate() + 1);
    }
    return bands;
  }, [timelineDates, dateToX, viewMode]);

  // Timeline header ticks
  const headerTicks = useMemo(() => {
    const ticks: Array<{ left: number; width: number; topLabel: string; bottomLabel: string }> = [];
    const current = new Date(timelineDates.start);

    if (viewMode === 'Day') {
      while (current < timelineDates.end) {
        const left = dateToX(current);
        const next = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1);
        const width = dateToX(next) - left;
        ticks.push({
          left,
          width,
          topLabel: current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          bottomLabel: current.getDate().toString()
        });
        current.setDate(current.getDate() + 1);
      }
    } else if (viewMode === 'Week') {
      const day = current.getDay();
      current.setDate(current.getDate() - day);
      while (current < timelineDates.end) {
        const left = dateToX(current);
        const next = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 7);
        const width = dateToX(next) - left;
        // ISO week
        const d = new Date(Date.UTC(current.getFullYear(), current.getMonth(), current.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

        ticks.push({
          left,
          width,
          topLabel: current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          bottomLabel: `W${weekNo}`
        });
        current.setDate(current.getDate() + 7);
      }
    } else if (viewMode === 'Month') {
      current.setDate(1);
      while (current < timelineDates.end) {
        const left = dateToX(current);
        const next = new Date(current.getFullYear(), current.getMonth() + 1, 1);
        const width = dateToX(next) - left;
        ticks.push({
          left,
          width,
          topLabel: current.getFullYear().toString(),
          bottomLabel: current.toLocaleDateString('en-US', { month: 'short' })
        });
        current.setMonth(current.getMonth() + 1);
      }
    } else if (viewMode === 'Quarter') {
      const qMonth = Math.floor(current.getMonth() / 3) * 3;
      current.setMonth(qMonth, 1);
      while (current < timelineDates.end) {
        const left = dateToX(current);
        const next = new Date(current.getFullYear(), current.getMonth() + 3, 1);
        const width = dateToX(next) - left;
        ticks.push({
          left,
          width,
          topLabel: current.getFullYear().toString(),
          bottomLabel: `Q${Math.floor(current.getMonth() / 3) + 1}`
        });
        current.setMonth(current.getMonth() + 3);
      }
    } else if (viewMode === 'Year') {
      current.setMonth(0, 1);
      while (current < timelineDates.end) {
        const left = dateToX(current);
        const next = new Date(current.getFullYear() + 1, 0, 1);
        const width = dateToX(next) - left;
        ticks.push({
          left,
          width,
          topLabel: '',
          bottomLabel: current.getFullYear().toString()
        });
        current.setFullYear(current.getFullYear() + 1);
      }
    }

    return ticks;
  }, [timelineDates, viewMode, dateToX]);

  // ── Filter & Group Data ─────────────────────────────────────────────────────
  const filteredTargets = useMemo(() => {
    let list = localTargets;

    if (filterRAG !== 'ALL') {
      list = list.filter(t => t.ragStatus?.toUpperCase() === filterRAG);
    }
    if (filterMilestone) {
      list = list.filter(t => t.isMilestone);
    }
    if (filterCriticalOnly) {
      list = list.filter(t => criticalIds.has(t.id));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.owner.toLowerCase().includes(q) ||
        t.vertical.toLowerCase().includes(q)
      );
    }

    return list;
  }, [localTargets, filterRAG, filterMilestone, filterCriticalOnly, searchQuery, criticalIds]);

  // Check user permissions for target vertical creation
  const hasEditAccess = useCallback((targetVertical: string) => {
    if (!user) return false;
    const isAllowedRole = user.roles.some((r: any) =>
      ['SUPER_ADMIN', 'SALES_MANAGER', 'PRODUCTION_MANAGER', 'HR_MANAGER', 'PLANNING_ANALYST'].includes(r)
    );
    const isScoped = user.verticalScope && user.verticalScope.length > 0;
    return isAllowedRole && (!isScoped || user.verticalScope.includes(targetVertical));
  }, [user]);

  // Grouped rows construction (injects swimlane empty interactive rows)
  const rows = useMemo<GanttRow[]>(() => {
    if (groupBy === 'none') {
      const base: GanttRow[] = filteredTargets.map(t => ({
        type: 'task' as const,
        id: t.id,
        label: t.name,
        target: t
      }));

      if (base.length > 0) {
        base.push({
          type: 'ghost',
          id: 'ghost__bottom_affordance',
          label: '+ Add Target...'
        });
      }
      return base;
    }

    const key = groupBy === 'vertical' ? 'vertical' : 'owner';
    const groupsMap = new Map<string, GanttTarget[]>();

    for (const t of filteredTargets) {
      const gVal = t[key] || 'Unassigned';
      if (!groupsMap.has(gVal)) groupsMap.set(gVal, []);
      groupsMap.get(gVal)!.push(t);
    }

    const finalRows: GanttRow[] = [];

    for (const [gLabel, gTargets] of groupsMap) {
      const groupId = `group__${gLabel}`;
      const isCollapsed = collapsedGroups.has(groupId);

      const starts = gTargets.map(t => new Date(t.startDate).getTime());
      const ends = gTargets.map(t => new Date(t.deadline).getTime());
      const minStart = new Date(Math.min(...starts)).toISOString();
      const maxEnd = new Date(Math.max(...ends)).toISOString();
      const avgProgress = Math.round(gTargets.reduce((sum, t) => sum + (t.progressPct || 0), 0) / gTargets.length);

      finalRows.push({
        type: 'group',
        id: groupId,
        label: gLabel,
        progress: avgProgress,
        startDate: minStart,
        deadline: maxEnd
      });

      if (!isCollapsed) {
        for (const t of gTargets) {
          finalRows.push({
            type: 'task',
            id: t.id,
            label: t.name,
            target: t
          });
        }

        finalRows.push({
          type: 'ghost',
          id: `ghost__${gLabel}_1`,
          label: '+ Add target...',
          groupId: gLabel
        });
        finalRows.push({
          type: 'ghost',
          id: `ghost__${gLabel}_2`,
          label: '+ Add target...',
          groupId: gLabel
        });
      }
    }

    return finalRows;
  }, [filteredTargets, groupBy, collapsedGroups]);

  // ── Ghost Rows to Fill Remaining Viewport Height ───────────────────────────
  const [ghostRows, setGhostRows] = useState<number[]>([]);
  const bodyRowRef = useRef<HTMLDivElement>(null);

  const updateGhostRows = useCallback(() => {
    if (bodyRowRef.current) {
      const height = bodyRowRef.current.clientHeight;
      const totalPossibleRows = Math.floor(height / ROW_HEIGHT);
      const needed = Math.max(0, totalPossibleRows - rows.length);
      setGhostRows(Array.from({ length: needed }, (_, i) => i));
    }
  }, [rows.length]);

  useEffect(() => {
    updateGhostRows();
    const observer = new ResizeObserver(updateGhostRows);
    if (bodyRowRef.current) {
      observer.observe(bodyRowRef.current);
    }
    return () => observer.disconnect();
  }, [updateGhostRows]);

  // Keyboard shortcut 'N' opens Quick-Create
  useEffect(() => {
    const handleKeyDownGlobal = (e: KeyboardEvent) => {
      const activeEl = document.activeElement?.tagName.toLowerCase();
      if (activeEl === 'input' || activeEl === 'textarea' || activeEl === 'select') return;

      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        const start = new Date();
        const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
        setQuickCreate({
          startDate: start,
          deadline: end,
          x: window.innerWidth / 2 - 140,
          y: window.innerHeight / 2 - 150
        });
      }
    };
    window.addEventListener('keydown', handleKeyDownGlobal);
    return () => window.removeEventListener('keydown', handleKeyDownGlobal);
  }, []);

  const snapDate = useCallback((d: Date) => {
    const result = new Date(d);
    if (viewMode === 'Day') {
      result.setHours(0, 0, 0, 0);
    } else if (viewMode === 'Week') {
      const day = result.getDay();
      result.setDate(result.getDate() - day);
      result.setHours(0, 0, 0, 0);
    } else {
      result.setDate(1);
      result.setHours(0, 0, 0, 0);
    }
    return result;
  }, [viewMode]);

  // ── Drag-to-Create Logic ────────────────────────────────────────────────────
  const handleCanvasDragStart = (e: React.MouseEvent, rowIndex: number, rowGroupId?: string) => {
    const target = e.target as HTMLElement;
    if (target.closest('.gantt-task-bar-wrapper') || target.closest('.gantt-milestone-marker')) {
      return;
    }

    if (rowGroupId && !hasEditAccess(rowGroupId)) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    setQuickCreate(null);

    const startX = e.clientX;
    setDragCreate({
      startX,
      currentX: startX,
      rowIndex,
      groupId: rowGroupId
    });

    const handleMouseMoveGlobal = (moveEvent: MouseEvent) => {
      setDragCreate(prev => prev ? { ...prev, currentX: moveEvent.clientX } : null);
    };

    const handleMouseUpGlobal = (upEvent: MouseEvent) => {
      document.removeEventListener('mousemove', handleMouseMoveGlobal);
      document.removeEventListener('mouseup', handleMouseUpGlobal);

      const canvas = bodyHorizontalScrollRef.current;
      if (!canvas) {
        setDragCreate(null);
        return;
      }

      const canvasRect = canvas.getBoundingClientRect();
      const scrollX = canvas.scrollLeft;

      const px1 = Math.min(startX, upEvent.clientX) - canvasRect.left + scrollX;
      const px2 = Math.max(startX, upEvent.clientX) - canvasRect.left + scrollX;

      const date1 = snapDate(xToDate(px1));
      const date2 = snapDate(xToDate(px2));

      if (date2.getTime() - date1.getTime() < 24 * 60 * 60 * 1000) {
        date2.setDate(date2.getDate() + 1);
      }

      setQcName('');
      setQcOwner(user?.name || '');
      setQcVertical(rowGroupId || 'Sales');

      setQuickCreate({
        startDate: date1,
        deadline: date2,
        groupId: rowGroupId,
        x: Math.min(window.innerWidth - 300, Math.max(20, upEvent.clientX - 140)),
        y: Math.min(window.innerHeight - 380, Math.max(20, upEvent.clientY - 120))
      });

      setDragCreate(null);
    };

    document.addEventListener('mousemove', handleMouseMoveGlobal);
    document.addEventListener('mouseup', handleMouseUpGlobal);
  };

  // ── Drag & Drop Reschedule (Task bars & edges) ──────────────────────────────
  const handleBarMouseDown = useCallback((
    e: React.MouseEvent,
    targetId: string,
    action: 'move' | 'resize'
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (dependencySourceId) {
      if (dependencySourceId !== targetId) {
        handleConfirmDependency(targetId);
      }
      return;
    }

    const startX = e.clientX;
    const target = localTargets.find(t => t.id === targetId);
    if (!target) return;

    const initialStart = new Date(target.startDate);
    const initialEnd = new Date(target.deadline);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaDays = deltaX / pixelsPerDay;
      const deltaMs = deltaDays * 24 * 60 * 60 * 1000;

      let updatedStart = initialStart;
      let updatedEnd = initialEnd;

      if (action === 'move') {
        updatedStart = new Date(initialStart.getTime() + deltaMs);
        updatedEnd = new Date(initialEnd.getTime() + deltaMs);
      } else if (action === 'resize') {
        updatedEnd = new Date(initialEnd.getTime() + deltaMs);
        if (updatedEnd <= updatedStart) {
          updatedEnd = new Date(updatedStart.getTime() + 24 * 60 * 60 * 1000);
        }
      }

      setLocalTargets(prev => prev.map(t => {
        if (t.id === targetId) {
          return {
            ...t,
            startDate: updatedStart.toISOString(),
            deadline: updatedEnd.toISOString()
          };
        }
        return t;
      }));
    };

    const handleMouseUp = async (upEvent: MouseEvent) => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      const deltaX = upEvent.clientX - startX;
      const deltaDays = deltaX / pixelsPerDay;
      const deltaMs = deltaDays * 24 * 60 * 60 * 1000;

      let finalStart = initialStart;
      let finalEnd = initialEnd;

      if (action === 'move') {
        finalStart = new Date(initialStart.getTime() + deltaMs);
        finalEnd = new Date(initialEnd.getTime() + deltaMs);
      } else if (action === 'resize') {
        finalEnd = new Date(initialEnd.getTime() + deltaMs);
        if (finalEnd <= finalStart) {
          finalEnd = new Date(finalStart.getTime() + 24 * 60 * 60 * 1000);
        }
      }

      try {
        await api.patch(`/targets/${targetId}/schedule`, {
          startDate: finalStart.toISOString(),
          deadline: finalEnd.toISOString()
        });
        refresh();
      } catch (err) {
        console.error('Reschedule failed, rolling back.', err);
        refresh();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [localTargets, pixelsPerDay, api, refresh, dependencySourceId]);

  // Drag Progress Handle inside Task Bar
  const handleProgressMouseDown = useCallback((
    e: React.MouseEvent,
    targetId: string,
    barWidth: number
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const target = localTargets.find(t => t.id === targetId);
    if (!target) return;

    const initialProgress = target.progressPct || 0;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dp = Math.round((dx / barWidth) * 100);
      const newProgress = Math.min(100, Math.max(0, initialProgress + dp));

      setLocalTargets(prev => prev.map(t => {
        if (t.id === targetId) {
          return { ...t, progressPct: newProgress };
        }
        return t;
      }));
    };

    const handleMouseUp = async (upEvent: MouseEvent) => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      const dx = upEvent.clientX - startX;
      const dp = Math.round((dx / barWidth) * 100);
      const finalProgress = Math.min(100, Math.max(0, initialProgress + dp));

      try {
        await api.patch(`/targets/${targetId}/schedule`, {
          progressPct: finalProgress
        });
        refresh();
      } catch (err) {
        console.error('Progress change failed, rolling back.', err);
        refresh();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [localTargets, api, refresh]);

  // Click & Drag Canvas panning on background (not ghost rows or tasks)
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.classList.contains('gantt-chart-body-canvas')) {
      return;
    }

    e.preventDefault();
    const container = bodyHorizontalScrollRef.current;
    if (!container) return;

    const startX = e.clientX;
    const startScrollLeft = container.scrollLeft;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      container.scrollLeft = startScrollLeft - dx;
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  // Jump to Today
  const handleJumpToday = useCallback(() => {
    if (todayX !== null && bodyHorizontalScrollRef.current) {
      bodyHorizontalScrollRef.current.scrollTo({
        left: todayX - bodyHorizontalScrollRef.current.clientWidth / 2,
        behavior: 'smooth'
      });
    }
  }, [todayX]);

  // Save cell edit inline
  const handleCellSave = useCallback(async (targetId: string, colId: string, newValue: any) => {
    try {
      if (colId === 'name' || colId === 'owner') {
        await api.patch(`/targets/${targetId}`, { [colId]: newValue });
      } else if (colId === 'start') {
        await api.patch(`/targets/${targetId}/schedule`, { startDate: new Date(newValue).toISOString() });
      } else if (colId === 'deadline') {
        await api.patch(`/targets/${targetId}/schedule`, { deadline: new Date(newValue).toISOString() });
      } else if (colId === 'progress') {
        await api.patch(`/targets/${targetId}/schedule`, { progressPct: Math.min(100, Math.max(0, parseInt(newValue, 10) || 0)) });
      }
      refresh();
    } catch (err) {
      console.error('Inline cell save failed:', err);
      refresh();
    }
  }, [api, refresh]);

  // ── Context Menu Actions ────────────────────────────────────────────────────
  const handleContextMenu = (e: React.MouseEvent, targetId?: string, rowGroupId?: string) => {
    e.preventDefault();

    const canvas = bodyHorizontalScrollRef.current;
    let clickedDate: Date | undefined;

    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const relativeX = e.clientX - rect.left + canvas.scrollLeft;
      clickedDate = snapDate(xToDate(relativeX));
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      targetId,
      groupId: rowGroupId,
      clickedDate
    });
  };

  const handleCreateFromContext = (isMilestone = false) => {
    if (!contextMenu) return;

    const start = contextMenu.clickedDate || new Date();
    const end = isMilestone ? start : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

    setQcName('');
    setQcOwner(user?.name || '');
    setQcVertical(contextMenu.groupId || 'Sales');

    setQuickCreate({
      startDate: start,
      deadline: end,
      groupId: contextMenu.groupId,
      x: Math.min(window.innerWidth - 300, contextMenu.x),
      y: Math.min(window.innerHeight - 380, contextMenu.y),
      isMilestone
    });
    setContextMenu(null);
  };

  const handleDuplicateTarget = async (targetId: string) => {
    const original = localTargets.find(t => t.id === targetId);
    if (!original) return;

    try {
      await api.post('/targets', {
        name: `${original.name} (Copy)`,
        vertical: original.vertical,
        owner: original.owner,
        startDate: original.startDate,
        deadline: original.deadline,
        baseline: original.baseline || 0,
        targetValue: original.targetValue || 100,
        currentValue: original.currentValue || 0,
        unit: original.unit || '%',
        direction: original.direction || 'UP'
      });
      refresh();
    } catch (err) {
      console.error('Duplication failed:', err);
    }
    setContextMenu(null);
  };

  const handleDeleteTarget = async (targetId: string) => {
    if (!window.confirm('Are you sure you want to delete this target?')) return;
    try {
      await api.delete(`/targets/${targetId}`);
      refresh();
    } catch (err) {
      console.error('Delete failed:', err);
    }
    setContextMenu(null);
  };

  const handleToggleMilestone = async (targetId: string) => {
    const task = localTargets.find(t => t.id === targetId);
    if (!task) return;
    try {
      await api.patch(`/targets/${targetId}/schedule`, {
        isMilestone: !task.isMilestone
      });
      refresh();
    } catch (err) {
      console.error('Milestone toggle failed:', err);
    }
    setContextMenu(null);
  };

  const handleCopyTarget = (targetId: string) => {
    const task = localTargets.find(t => t.id === targetId);
    if (task) {
      setCopiedTarget(task);
    }
    setContextMenu(null);
  };

  const handlePasteTarget = async () => {
    if (!copiedTarget || !contextMenu) return;
    const start = contextMenu.clickedDate || new Date();
    const duration = new Date(copiedTarget.deadline).getTime() - new Date(copiedTarget.startDate).getTime();
    const end = new Date(start.getTime() + duration);

    try {
      await api.post('/targets', {
        name: copiedTarget.name,
        vertical: contextMenu.groupId || copiedTarget.vertical,
        owner: copiedTarget.owner,
        startDate: start.toISOString(),
        deadline: end.toISOString(),
        baseline: copiedTarget.baseline || 0,
        targetValue: copiedTarget.targetValue || 100,
        currentValue: copiedTarget.currentValue || 0,
        unit: copiedTarget.unit || '%',
        direction: copiedTarget.direction || 'UP'
      });
      refresh();
    } catch (err) {
      console.error('Paste failed:', err);
    }
    setContextMenu(null);
  };

  const handleConfirmDependency = async (targetId: string) => {
    if (!dependencySourceId) return;
    try {
      await api.post(`/targets/${targetId}/dependencies`, {
        predecessorId: dependencySourceId,
        type: 'FS',
        lagDays: 0
      });
      refresh();
    } catch (err) {
      console.error('Adding dependency failed:', err);
    } finally {
      setDependencySourceId(null);
    }
  };

  // ── Quick-Create Popover Submission ──────────────────────────────────────────
  const handleQuickCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCreate) return;

    try {
      await api.post('/targets', {
        name: qcName || (quickCreate.isMilestone ? 'New Milestone' : 'New Task'),
        vertical: qcVertical,
        owner: qcOwner,
        startDate: quickCreate.startDate.toISOString(),
        deadline: quickCreate.deadline.toISOString(),
        isMilestone: !!quickCreate.isMilestone,
        baseline: 0,
        targetValue: 100,
        currentValue: 0,
        unit: '%',
        direction: 'UP'
      });
      setQuickCreate(null);
      refresh();
    } catch (err) {
      console.error('Quick target creation failed:', err);
    }
  };

  // Empty Grid Row Click Handler (Triggers Popover)
  const handleEmptyRowClick = (e: React.MouseEvent, rowGroupId?: string) => {
    const canvas = bodyHorizontalScrollRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const relativeX = e.clientX - rect.left + canvas.scrollLeft;
    const start = snapDate(xToDate(relativeX));
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

    setQcName('');
    setQcOwner(user?.name || '');
    setQcVertical(rowGroupId || 'Sales');

    setQuickCreate({
      startDate: start,
      deadline: end,
      groupId: rowGroupId,
      x: Math.min(window.innerWidth - 300, Math.max(20, e.clientX - 140)),
      y: Math.min(window.innerHeight - 380, Math.max(20, e.clientY - 120))
    });
  };

  // Close context menu and Quick Create on click away
  useEffect(() => {
    const handleGlobalClick = () => {
      setContextMenu(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // ── SVG Dependencies Construction ───────────────────────────────────────────
  const dependencyLines = useMemo(() => {
    const lines: React.ReactNode[] = [];
    const visibleRowIds = new Set(rows.filter(r => r.type === 'task').map(r => r.id));

    rows.forEach((row, succIdx) => {
      if (row.type !== 'task' || !row.target) return;
      const t = row.target;

      t.dependencies.forEach(d => {
        if (!visibleRowIds.has(d.predecessorId)) return;
        const predIdx = rows.findIndex(r => r.id === d.predecessorId);
        if (predIdx === -1) return;

        const predRow = rows[predIdx];
        if (predRow.type !== 'task' || !predRow.target) return;

        const yPred = predIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
        const ySucc = succIdx * ROW_HEIGHT + ROW_HEIGHT / 2;

        const xPredEnd = dateToX(new Date(predRow.target.deadline));
        const xSuccStart = dateToX(new Date(t.startDate));

        const offset = 12;
        let dPath = '';

        if (xSuccStart >= xPredEnd + offset) {
          const midX = xPredEnd + (xSuccStart - xPredEnd) / 2;
          dPath = `M ${xPredEnd} ${yPred} L ${midX} ${yPred} L ${midX} ${ySucc} L ${xSuccStart} ${ySucc}`;
        } else {
          const midY = yPred + (ySucc - yPred) / 2;
          dPath = `M ${xPredEnd} ${yPred} L ${xPredEnd + offset} ${yPred} L ${xPredEnd + offset} ${midY} L ${xSuccStart - offset} ${midY} L ${xSuccStart - offset} ${ySucc} L ${xSuccStart} ${ySucc}`;
        }

        lines.push(
          <path
            key={`${d.predecessorId}-${t.id}`}
            d={dPath}
            className="gantt-dependency-line"
            markerEnd="url(#gantt-arrowhead)"
          />
        );
      });
    });

    return lines;
  }, [rows, dateToX]);

  const [hoveredTask, setHoveredTask] = useState<{
    task: GanttTarget;
    x: number;
    y: number;
  } | null>(null);

  const handleMouseEnter = (e: React.MouseEvent, task: GanttTarget) => {
    setHoveredTask({
      task,
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleMouseMoveTooltip = (e: React.MouseEvent) => {
    const canvas = bodyHorizontalScrollRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      if (relativeX >= 0 && relativeX <= rect.width) {
        setHoverGuideX(relativeX + canvas.scrollLeft);
      } else {
        setHoverGuideX(null);
      }
    }

    if (hoveredTask) {
      setHoveredTask(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredTask(null);
    setHoverGuideX(null);
  };

  const handleExportPNG = async () => {
    if (!ganttPageRef.current) return;
    try {
      const dataUrl = await toPng(ganttPageRef.current, { quality: 0.95, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `gantt-timeline-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error('PNG export failed', e);
    }
  };

  const handleExportCSV = () => {
    const csv = targetsToCSV(filteredTargets);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `timeline-targets-${new Date().toISOString().split('T')[0]}.csv`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="gantt-loading">
        <div className="gantt-loading-spinner" />
        <span>Building custom timeline...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card" style={{ color: 'var(--color-rag-red)', padding: '24px', margin: '32px' }}>
        ⚠ {error}
      </div>
    );
  }

  const totalGridWidth = Object.values(columnWidths).reduce((a, b) => a + b, 0);
  const totalCanvasHeight = (rows.length + ghostRows.length) * ROW_HEIGHT;

  return (
    <div
      className="gantt-page-root"
      ref={ganttPageRef}
      onMouseMove={handleMouseMoveTooltip}
    >
      {/* Dependency Selection Banner */}
      {dependencySourceId && (
        <div className="gantt-dependency-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GitBranch size={16} />
            <span>
              <strong>Dependency Mode Active:</strong> Select target to add Finish-to-Start dependency to. Click another task row or bar to confirm.
            </span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setDependencySourceId(null)}>
            Cancel
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="gantt-toolbar">
        {/* Search */}
        <div className="gantt-toolbar-group">
          <div className="gantt-search-wrap">
            <Search size={14} className="gantt-search-icon" />
            <input
              className="gantt-search-input"
              type="text"
              placeholder="Search targets…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Zoom */}
        <div className="gantt-toolbar-group">
          <span className="gantt-toolbar-label">
            <Calendar size={13} /> Zoom
          </span>
          <div className="gantt-btn-group">
            {(['Day', 'Week', 'Month', 'Quarter', 'Year'] as ViewMode[]).map(m => (
              <button
                key={m}
                className={`gantt-zoom-btn ${viewMode === m ? 'active' : ''}`}
                onClick={() => setViewMode(m)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Grouping */}
        <div className="gantt-toolbar-group">
          <span className="gantt-toolbar-label">
            <Layers size={13} /> Group
          </span>
          <select
            className="gantt-select"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
          >
            <option value="none">None</option>
            <option value="vertical">Vertical</option>
            <option value="owner">Owner</option>
          </select>
        </div>

        {/* RAG */}
        <div className="gantt-toolbar-group">
          <span className="gantt-toolbar-label">
            <SlidersHorizontal size={13} /> RAG
          </span>
          <select
            className="gantt-select"
            value={filterRAG}
            onChange={(e) => setFilterRAG(e.target.value as FilterRAG)}
          >
            <option value="ALL">All Statuses</option>
            <option value="GREEN">Green</option>
            <option value="AMBER">Amber</option>
            <option value="RED">Red</option>
          </select>
        </div>

        {/* Toggles */}
        <div className="gantt-toolbar-group">
          <button
            className={`gantt-toggle-btn ${showCritical ? 'active critical' : ''}`}
            onClick={() => setShowCritical(!showCritical)}
          >
            <GitBranch size={13} />
            Critical Path
          </button>
          <button
            className={`gantt-toggle-btn ${showBaseline ? 'active' : ''}`}
            onClick={() => setShowBaseline(!showBaseline)}
          >
            <BookMarked size={13} />
            Baseline
          </button>
          <button
            className={`gantt-toggle-btn ${filterMilestone ? 'active' : ''}`}
            onClick={() => setFilterMilestone(!filterMilestone)}
          >
            ◆ Milestones
          </button>
          <button
            className={`gantt-toggle-btn ${filterCriticalOnly ? 'active critical' : ''}`}
            onClick={() => setFilterCriticalOnly(!filterCriticalOnly)}
          >
            Critical Only
          </button>
        </div>

        {/* Actions */}
        <div className="gantt-toolbar-group" style={{ marginLeft: 'auto' }}>
          <button className="gantt-action-btn" onClick={handleJumpToday}>
            <RotateCcw size={13} />
            Today
          </button>
          <button className="gantt-action-btn" onClick={handleExportPNG}>
            <Download size={13} />
            PNG
          </button>
          <button className="gantt-action-btn" onClick={handleExportCSV}>
            <FileText size={13} />
            CSV
          </button>
          <button className="gantt-action-btn" onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            {isFullscreen ? <Minimize size={13} /> : <Maximize size={13} />}
          </button>
        </div>
      </div>

      {/* Main Gantt Grid Container */}
      <div className="gantt-container" onContextMenu={(e) => handleContextMenu(e)}>
        {/* Header Row */}
        <div className="gantt-header-row">
          {/* Left headers */}
          <div className="gantt-grid-header" style={{ width: totalGridWidth }}>
            {visibleColumns.map(col => (
              <div
                key={col.id}
                className="gantt-grid-header-cell"
                style={{ width: columnWidths[col.id] }}
              >
                {col.label}
                <div
                  className="gantt-column-resize-handle"
                  onMouseDown={(e) => handleResizeMouseDown(e, col.id)}
                />
              </div>
            ))}
          </div>

          {/* Right calendar scale (header) */}
          <div className="gantt-chart-header-scroll" ref={headerScrollRef}>
            <div className="gantt-chart-header-canvas" style={{ width: totalTimelineWidth }}>
              {headerTicks.map((tick, idx) => (
                <div
                  key={idx}
                  className="gantt-chart-header-tick"
                  style={{ left: tick.left, width: tick.width }}
                >
                  <span className="gantt-tick-label-top">{tick.topLabel}</span>
                  <span className="gantt-tick-label-bottom">{tick.bottomLabel}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Empty state */}
        {rows.length === 0 && (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Calendar size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
            <h3>No targets match your current filters</h3>
            <p>Try resetting the status filters or editing search query.</p>
          </div>
        )}

        {/* Body Container */}
        {rows.length > 0 && (
          <div className="gantt-body-row" ref={bodyRowRef}>
            {/* Left columns grid */}
            <div className="gantt-grid-body" style={{ width: totalGridWidth }}>
              {rows.map((row) => {
                const isSelected = row.type === 'task' && row.id === hoveredTask?.task.id;
                const isGroup = row.type === 'group';
                const isGhost = row.type === 'ghost';
                const access = row.target ? hasEditAccess(row.target.vertical) : false;

                if (isGhost) {
                  return (
                    <div
                      key={row.id}
                      className="gantt-grid-row ghost-row"
                      style={{ height: ROW_HEIGHT }}
                      onClick={(e) => hasEditAccess(row.groupId || 'Sales') && handleEmptyRowClick(e, row.groupId)}
                      onContextMenu={(e) => handleContextMenu(e, undefined, row.groupId)}
                    >
                      <div className="gantt-grid-cell" style={{ width: totalGridWidth, borderRight: 'none' }}>
                        <span className="gantt-add-affordance-text">
                          <Plus size={12} /> {row.label}
                        </span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={row.id}
                    className={`gantt-grid-row ${isSelected ? 'selected' : ''} ${isGroup ? 'group-row' : ''}`}
                    style={{ height: ROW_HEIGHT }}
                    onClick={() => isGroup && handleGroupToggle(row.id)}
                    onContextMenu={(e) => handleContextMenu(e, row.id, isGroup ? undefined : row.target?.vertical)}
                  >
                    {/* Task Name Column */}
                    {showCondensedGrid || visibleColumns.some(c => c.id === 'name') ? (
                      <div className="gantt-grid-cell name-col" style={{ width: columnWidths.name }}>
                        {isGroup ? (
                          collapsedGroups.has(row.id) ? (
                            <ChevronRight size={14} className="group-chevron" />
                          ) : (
                            <ChevronDown size={14} className="group-chevron" />
                          )
                        ) : row.target?.isMilestone ? (
                          <span className="milestone-diamond">◆</span>
                        ) : null}
                        {showCritical && row.target && criticalIds.has(row.target.id) && (
                          <span className="critical-dot" title="Critical path" />
                        )}

                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {isGroup ? (
                            <strong>{row.label}</strong>
                          ) : row.target ? (
                            <GridCell
                              target={row.target}
                              colId="name"
                              value={row.label}
                              hasAccess={access}
                              onSave={handleCellSave}
                            />
                          ) : (
                            row.label
                          )}
                          {row.target && showCondensedGrid && (
                            <div className="gantt-grid-cell-subtitle">
                              Owner: {row.target.owner} | {row.target.progressPct}%
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}

                    {/* Owner Column */}
                    {!showCondensedGrid && visibleColumns.some(c => c.id === 'owner') ? (
                      <div className="gantt-grid-cell" style={{ width: columnWidths.owner }}>
                        {row.target ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <UserIcon size={12} style={{ opacity: 0.6 }} />
                            <GridCell
                              target={row.target}
                              colId="owner"
                              value={row.target.owner}
                              hasAccess={access}
                              onSave={handleCellSave}
                            />
                          </div>
                        ) : isGroup ? (
                          <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Group Rollup</span>
                        ) : '-'}
                      </div>
                    ) : null}

                    {/* Start Date Column */}
                    {visibleColumns.some(c => c.id === 'start') ? (
                      <div className="gantt-grid-cell center-col" style={{ width: columnWidths.start }}>
                        {row.target ? (
                          <GridCell
                            target={row.target}
                            colId="start"
                            value={row.target.startDate}
                            hasAccess={access}
                            onSave={handleCellSave}
                          />
                        ) : row.startDate ? (
                          new Date(row.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                        ) : '-'}
                      </div>
                    ) : null}

                    {/* Deadline Column */}
                    {visibleColumns.some(c => c.id === 'deadline') ? (
                      <div className="gantt-grid-cell center-col" style={{ width: columnWidths.deadline }}>
                        {row.target ? (
                          <GridCell
                            target={row.target}
                            colId="deadline"
                            value={row.target.deadline}
                            hasAccess={access}
                            onSave={handleCellSave}
                          />
                        ) : row.deadline ? (
                          new Date(row.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
                        ) : '-'}
                      </div>
                    ) : null}

                    {/* Progress Column */}
                    {!showCondensedGrid && visibleColumns.some(c => c.id === 'progress') ? (
                      <div className="gantt-grid-cell" style={{ width: columnWidths.progress }}>
                        {row.target ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
                            <div className="grid-progress-wrap" style={{ flexGrow: 1 }}>
                              <div
                                className="grid-progress-bar"
                                style={{
                                  width: `${row.target.progressPct}%`,
                                  background: `var(--color-rag-${row.target.ragStatus.toLowerCase()})`
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', minWidth: '26px', textAlign: 'right' }}>
                              {row.target.progressPct}%
                            </span>
                          </div>
                        ) : row.progress !== undefined ? (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{row.progress}%</span>
                        ) : '-'}
                      </div>
                    ) : null}

                    {/* RAG Status Column */}
                    {visibleColumns.some(c => c.id === 'rag') ? (
                      <div className="gantt-grid-cell center-col" style={{ width: columnWidths.rag }}>
                        {row.target ? (
                          <span className={`badge ${row.target.ragStatus.toLowerCase()}`}>
                            {row.target.ragStatus}
                          </span>
                        ) : '-'}
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {/* Ghost rows at the bottom of the grid to visually continue to the edge */}
              {ghostRows.map((index) => (
                <div
                  key={`ghost-grid-${index}`}
                  className="gantt-grid-row ghost-row"
                  style={{ height: ROW_HEIGHT }}
                  onClick={(e) => hasEditAccess('Sales') && handleEmptyRowClick(e)}
                  onContextMenu={(e) => handleContextMenu(e, undefined)}
                >
                  {visibleColumns.map(col => (
                    <div
                      key={col.id}
                      className="gantt-grid-cell"
                      style={{ width: columnWidths[col.id] }}
                    >
                      {col.id === 'name' && (
                        <span className="gantt-add-affordance-text">
                          <Plus size={12} /> + Add target...
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Right chart canvas grid */}
            <div
              className="gantt-chart-body-scroll"
              ref={bodyHorizontalScrollRef}
              onScroll={handleHorizontalScroll}
              onMouseDown={handleCanvasMouseDown}
              onMouseLeave={handleMouseLeave}
            >
              <div
                className="gantt-chart-body-canvas"
                style={{
                  width: totalTimelineWidth,
                  height: totalCanvasHeight
                }}
              >
                {/* 1. Weekend shading Bands (in background) */}
                {weekendBands.map((band, idx) => (
                  <div
                    key={idx}
                    className="gantt-weekend-band"
                    style={{
                      position: 'absolute',
                      left: band.left,
                      width: band.width,
                      top: 0,
                      bottom: 0,
                      height: '100%',
                      pointerEvents: 'none'
                    }}
                  />
                ))}

                {/* 2. Today Line marker */}
                {todayX !== null && (
                  <div
                    className="gantt-today-line"
                    style={{
                      position: 'absolute',
                      left: todayX,
                      top: 0,
                      bottom: 0,
                      width: '2px',
                      background: 'var(--color-primary)',
                      zIndex: 5,
                      pointerEvents: 'none'
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: '-4px',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: 'var(--color-primary)'
                      }}
                    />
                  </div>
                )}

                {/* Hover vertical guide line */}
                {hoverGuideX !== null && (
                  <div
                    className="gantt-hover-guide"
                    style={{
                      position: 'absolute',
                      left: hoverGuideX,
                      top: 0,
                      bottom: 0,
                      width: '1px',
                      borderLeft: '1px dashed rgba(255, 255, 255, 0.15)',
                      pointerEvents: 'none',
                      zIndex: 6
                    }}
                  />
                )}

                {/* 3. Task Rows on Canvas */}
                {rows.map((row, idx) => {
                  const isGroup = row.type === 'group';
                  const isGhost = row.type === 'ghost';

                  if (isGhost) {
                    return (
                      <div
                        key={row.id}
                        className="gantt-chart-row ghost-row"
                        style={{ height: ROW_HEIGHT, width: totalTimelineWidth }}
                        onMouseDown={(e) => handleCanvasDragStart(e, idx, row.groupId)}
                        onContextMenu={(e) => handleContextMenu(e, undefined, row.groupId)}
                      >
                        {/* Drag preview bar if active */}
                        {dragCreate && dragCreate.rowIndex === idx && (
                          <div
                            className="gantt-task-bar-preview"
                            style={{
                              left: Math.min(dragCreate.startX, dragCreate.currentX) - (bodyHorizontalScrollRef.current?.getBoundingClientRect().left || 0) + (bodyHorizontalScrollRef.current?.scrollLeft || 0),
                              width: Math.abs(dragCreate.startX - dragCreate.currentX)
                            }}
                          />
                        )}
                      </div>
                    );
                  }

                  if (isGroup) {
                    const xStart = dateToX(new Date(row.startDate!));
                    const xEnd = dateToX(new Date(row.deadline!));
                    const width = Math.max(8, xEnd - xStart);

                    return (
                      <div
                        key={row.id}
                        className="gantt-chart-row group-row"
                        style={{
                          height: ROW_HEIGHT,
                          width: totalTimelineWidth
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            left: xStart,
                            width,
                            top: '12px',
                            height: '8px',
                            background: 'rgba(99, 102, 241, 0.4)',
                            borderRadius: '3px'
                          }}
                          title={`Group Progress: ${row.progress}%`}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${row.progress}%`,
                              background: 'var(--color-primary)',
                              borderRadius: '3px'
                            }}
                          />
                        </div>
                      </div>
                    );
                  }

                  const t = row.target!;
                  const isCritical = showCritical && criticalIds.has(t.id);
                  const xStart = dateToX(new Date(t.startDate));
                  const xEnd = dateToX(new Date(t.deadline));
                  const barWidth = Math.max(8, xEnd - xStart);
                  const access = hasEditAccess(t.vertical);

                  return (
                    <div
                      key={t.id}
                      className="gantt-chart-row"
                      style={{
                        height: ROW_HEIGHT,
                        width: totalTimelineWidth
                      }}
                      onContextMenu={(e) => handleContextMenu(e, t.id, t.vertical)}
                    >
                      {t.isMilestone ? (
                        <div
                          className="gantt-milestone-marker"
                          style={{
                            position: 'absolute',
                            left: xStart - 6,
                            top: '50%',
                            transform: 'translateY(-50%) rotate(45deg)',
                            width: '12px',
                            height: '12px',
                            background: 'var(--color-accent)',
                            boxShadow: '0 0 8px var(--color-accent-glow)',
                            cursor: access ? 'grab' : 'default',
                            zIndex: 4
                          }}
                          onMouseDown={(e) => access && handleBarMouseDown(e, t.id, 'move')}
                          onMouseEnter={(e) => handleMouseEnter(e, t)}
                          onMouseLeave={handleMouseLeave}
                          title={`${t.name} (Milestone)`}
                        />
                      ) : (
                        <div
                          className={`gantt-task-bar-wrapper ${isCritical ? 'critical' : ''}`}
                          style={{
                            left: xStart,
                            width: barWidth,
                            background: `var(--color-rag-${t.ragStatus.toLowerCase()}-bg)`,
                            border: `1px solid var(--color-rag-${t.ragStatus.toLowerCase()}-border)`
                          }}
                          onMouseDown={(e) => access && handleBarMouseDown(e, t.id, 'move')}
                          onMouseEnter={(e) => handleMouseEnter(e, t)}
                          onMouseLeave={handleMouseLeave}
                        >
                          <div className="gantt-task-bar">
                            <div
                              className="gantt-task-bar-progress"
                              style={{
                                width: `${t.progressPct}%`,
                                background: `var(--color-rag-${t.ragStatus.toLowerCase()})`
                              }}
                            />
                            {access && (
                              <div
                                className="gantt-task-bar-progress-handle"
                                style={{ left: `${t.progressPct}%` }}
                                onMouseDown={(e) => handleProgressMouseDown(e, t.id, barWidth)}
                              />
                            )}
                          </div>
                          {access && (
                            <div
                              className="gantt-task-bar-resize-handle"
                              onMouseDown={(e) => handleBarMouseDown(e, t.id, 'resize')}
                            />
                          )}
                        </div>
                      )}

                      {showBaseline && t.latestBaseline && (
                        <div
                          className="gantt-baseline-bar"
                          style={{
                            position: 'absolute',
                            left: dateToX(new Date(t.latestBaseline.baselineStart)),
                            width: Math.max(6, dateToX(new Date(t.latestBaseline.baselineEnd)) - dateToX(new Date(t.latestBaseline.baselineStart))),
                            top: '26px',
                            height: '10px',
                            borderRadius: '3px',
                            background: 'rgba(148, 163, 184, 0.15)',
                            border: '1px dashed rgba(148, 163, 184, 0.4)',
                            pointerEvents: 'none'
                          }}
                        />
                      )}
                    </div>
                  );
                })}

                {/* Ghost rows on the canvas body */}
                {ghostRows.map((index) => {
                  const actualRowIdx = rows.length + index;
                  return (
                    <div
                      key={`ghost-chart-${index}`}
                      className="gantt-chart-row ghost-row"
                      style={{
                        height: ROW_HEIGHT,
                        width: totalTimelineWidth
                      }}
                      onMouseDown={(e) => handleCanvasDragStart(e, actualRowIdx)}
                      onContextMenu={(e) => handleContextMenu(e, undefined)}
                    >
                      {/* Drag preview bar if active */}
                      {dragCreate && dragCreate.rowIndex === actualRowIdx && (
                        <div
                          className="gantt-task-bar-preview"
                          style={{
                            left: Math.min(dragCreate.startX, dragCreate.currentX) - (bodyHorizontalScrollRef.current?.getBoundingClientRect().left || 0) + (bodyHorizontalScrollRef.current?.scrollLeft || 0),
                            width: Math.abs(dragCreate.startX - dragCreate.currentX)
                          }}
                        />
                      )}
                    </div>
                  );
                })}

                {/* 4. Dependency Connector Lines SVG Layer */}
                <svg className="gantt-svg-overlay">
                  <defs>
                    <marker
                      id="gantt-arrowhead"
                      viewBox="0 0 10 10"
                      refX="6"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 6 5 L 0 8.5 z" fill="rgba(148, 163, 184, 0.5)" />
                    </marker>
                  </defs>
                  {dependencyLines}
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Inline Quick-Create Popover */}
      {quickCreate && (
        <div
          className="gantt-quick-create"
          style={{
            left: quickCreate.x,
            top: quickCreate.y
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="gantt-quick-create-title">
            {quickCreate.isMilestone ? 'Quick Add Milestone' : 'Quick Add Target'}
          </div>
          <form onSubmit={handleQuickCreateSubmit}>
            <div className="gantt-quick-create-row">
              <label>Name</label>
              <input
                type="text"
                required
                value={qcName}
                onChange={(e) => setQcName(e.target.value)}
                placeholder="e.g. Launch Beta"
                autoFocus
              />
            </div>
            <div className="gantt-quick-create-row">
              <label>Owner</label>
              <input
                type="text"
                required
                value={qcOwner}
                onChange={(e) => setQcOwner(e.target.value)}
                placeholder="e.g. John Doe"
              />
            </div>
            <div className="gantt-quick-create-row">
              <label>Vertical</label>
              <select
                value={qcVertical}
                onChange={(e) => setQcVertical(e.target.value)}
                disabled={!!quickCreate.groupId}
              >
                <option value="Sales">Sales</option>
                <option value="Production">Production</option>
                <option value="Hiring">Hiring</option>
              </select>
            </div>
            <div className="gantt-quick-create-row">
              <label>Dates</label>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {quickCreate.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {!quickCreate.isMilestone && ` - ${quickCreate.deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
              </span>
            </div>

            <div className="gantt-quick-create-actions">
              <button
                type="button"
                className="gantt-quick-create-btn cancel"
                onClick={() => setQuickCreate(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="gantt-quick-create-btn save"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Right-Click Context Menu */}
      {contextMenu && (
        <div
          className="gantt-context-menu"
          style={{
            left: contextMenu.x,
            top: contextMenu.y
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.targetId ? (
            // Context Menu for populated target row
            <>
              <div
                className="gantt-context-menu-item"
                onClick={() => {
                  navigate(`/targets/${contextMenu.targetId}`);
                  setContextMenu(null);
                }}
              >
                <Edit2 size={12} /> Edit Details
              </div>
              <div
                className="gantt-context-menu-item"
                onClick={() => {
                  setDependencySourceId(contextMenu.targetId!);
                  setContextMenu(null);
                }}
              >
                <GitBranch size={12} /> Add Dependency From Here
              </div>
              <div
                className="gantt-context-menu-item"
                onClick={() => handleToggleMilestone(contextMenu.targetId!)}
              >
                ◆ Toggle Milestone
              </div>
              <div
                className="gantt-context-menu-item"
                onClick={() => handleCopyTarget(contextMenu.targetId!)}
              >
                <Copy size={12} /> Copy Target
              </div>
              <div
                className="gantt-context-menu-item"
                onClick={() => handleDuplicateTarget(contextMenu.targetId!)}
              >
                <Layers size={12} /> Duplicate Target
              </div>
              <div
                className="gantt-context-menu-item danger"
                onClick={() => handleDeleteTarget(contextMenu.targetId!)}
              >
                <Trash2 size={12} /> Delete Target
              </div>
            </>
          ) : (
            // Context Menu for empty space
            <>
              <div className="gantt-context-menu-item" onClick={() => handleCreateFromContext(false)}>
                <Plus size={12} /> Add Target Here
              </div>
              <div className="gantt-context-menu-item" onClick={() => handleCreateFromContext(true)}>
                ◆ Add Milestone Here
              </div>
              {copiedTarget && (
                <div className="gantt-context-menu-item" onClick={handlePasteTarget}>
                  <Copy size={12} style={{ transform: 'rotate(180deg)' }} /> Paste Copied Target
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Tooltip Overlay */}
      {hoveredTask && (
        <div
          className="gantt-tooltip"
          style={{
            left: hoveredTask.x,
            top: hoveredTask.y
          }}
        >
          <strong>{hoveredTask.task.name}</strong>
          <div className="gantt-tooltip-row">
            <span>Owner:</span>
            <span>{hoveredTask.task.owner}</span>
          </div>
          <div className="gantt-tooltip-row">
            <span>Vertical:</span>
            <span>{hoveredTask.task.vertical}</span>
          </div>
          <div className="gantt-tooltip-row">
            <span>RAG Status:</span>
            <span className={`badge ${hoveredTask.task.ragStatus.toLowerCase()}`} style={{ display: 'inline-block' }}>
              {hoveredTask.task.ragStatus}
            </span>
          </div>
          <div className="gantt-tooltip-row">
            <span>Start:</span>
            <span>{new Date(hoveredTask.task.startDate).toLocaleDateString()}</span>
          </div>
          <div className="gantt-tooltip-row">
            <span>Deadline:</span>
            <span>{new Date(hoveredTask.task.deadline).toLocaleDateString()}</span>
          </div>
          <div className="gantt-tooltip-row">
            <span>Progress:</span>
            <span>{hoveredTask.task.progressPct}%</span>
          </div>
          {hoveredTask.task.latestBaseline && (
            <div className="gantt-tooltip-row" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '6px', marginTop: '6px' }}>
              <span>Baseline:</span>
              <span>{new Date(hoveredTask.task.latestBaseline.baselineStart).toLocaleDateString()} - {new Date(hoveredTask.task.latestBaseline.baselineEnd).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Legend Block */}
      <div className="gantt-legend">
        <div className="gantt-legend-item">
          <span className="gantt-legend-dot green" />Green (On Track)
        </div>
        <div className="gantt-legend-item">
          <span className="gantt-legend-dot amber" />Amber (At Risk)
        </div>
        <div className="gantt-legend-item">
          <span className="gantt-legend-dot red" />Red (Off Track)
        </div>
        {showCritical && (
          <div className="gantt-legend-item">
            <span className="gantt-legend-dot critical" />Critical Path
          </div>
        )}
        {showBaseline && (
          <div className="gantt-legend-item">
            <span className="gantt-legend-dot baseline" />Baseline Plan
          </div>
        )}
        <div className="gantt-legend-item" style={{ marginLeft: 'auto', opacity: 0.6 }}>
          <Info size={12} style={{ display: 'inline-block', marginRight: '4px' }} />
          Double click cells to edit | Right click canvas for context menu | Press N to add target
        </div>
      </div>
    </div>
  );
};
