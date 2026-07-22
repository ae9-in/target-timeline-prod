import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toPng } from 'html-to-image';
import {
  Layers, GitBranch,
  Download, FileText, Search,
  RotateCcw, SlidersHorizontal, Calendar,
  ChevronDown, ChevronRight, ChevronLeft,
  Info, Maximize, Minimize, Plus, Trash2, Copy, Edit2, Sliders, X,
  Crosshair
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDepartments } from '../context/DepartmentContext';
import { useGanttData } from '../hooks/useGanttData';
import type { GanttTarget, ZoomLevelConfig } from '../utils/gantt-transform';
import { targetsToCSV, computeDateScale } from '../utils/gantt-transform';


// ─── Constants ────────────────────────────────────────────────────────────────
const ROW_HEIGHT = 44;

type GroupBy = 'none' | 'vertical' | 'owner';
type FilterRAG = 'ALL' | 'GREEN' | 'AMBER' | 'RED';
type ViewMode = 'Day' | 'Week' | 'Month' | 'Quarter' | 'Year' | 'Custom';

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

// ─── Main Timeline Component ──────────────────────────────────────────────────
export const Timeline: React.FC = () => {
  const { api, user } = useAuth();
  const { departments } = useDepartments();
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

  // Custom range states
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);

  // Quarter view states (persisted in localStorage)
  const [quarterCount, setQuarterCount] = useState<number>(() => {
    const saved = localStorage.getItem('gantt_quarter_count');
    return saved ? parseInt(saved, 10) : 4;
  });
  const [quarterLength, setQuarterLength] = useState<number>(() => {
    const saved = localStorage.getItem('gantt_quarter_length');
    return saved ? parseInt(saved, 10) : 3;
  });

  useEffect(() => {
    localStorage.setItem('gantt_quarter_count', quarterCount.toString());
  }, [quarterCount]);
  useEffect(() => {
    localStorage.setItem('gantt_quarter_length', quarterLength.toString());
  }, [quarterLength]);

  // Viewport navigation start state
  const [viewportStart, setViewportStart] = useState<Date>(() => new Date());

  // Dynamic canvas width state
  const [canvasWidthPx, setCanvasWidthPx] = useState<number>(800);

  // Custom date picker popup
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [tempCustomStart, setTempCustomStart] = useState('');
  const [tempCustomEnd, setTempCustomEnd] = useState('');

  // Track if viewport has initialized based on first target date
  const [hasInitializedViewport, setHasInitializedViewport] = useState(false);

  // View Options dropdown popover menu
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);

  // Optional Left scannable index strip (off by default)
  const [showCompactStrip, setShowCompactStrip] = useState(false);

  // Horizontal Scroll tracking for label pinning
  const [scrollLeft, setScrollLeft] = useState(0);

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
  const [qcVertical, setQcVertical] = useState(() => departments[0]?.name || '');
  const [qcError, setQcError] = useState<string | null>(null);

  // Edit Target & Progress Modal State
  const [editTargetModal, setEditTargetModal] = useState<GanttTarget | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [editStartDate, setEditStartDate] = useState<string>('');
  const [editDeadline, setEditDeadline] = useState<string>('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState<boolean>(false);

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

  // Scroll Sync Refs
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyHorizontalScrollRef = useRef<HTMLDivElement>(null);
  const ganttContainerRef = useRef<HTMLDivElement>(null);

  // Hook to pull data
  const { targets, criticalIds, loading, error, refresh } = useGanttData(api);

  // Local copy of targets for optimistic updates
  const [localTargets, setLocalTargets] = useState<GanttTarget[]>([]);

  useEffect(() => {
    if (targets) {
      setLocalTargets(targets);
    }
  }, [targets]);

  // Sync viewport start once based on first target date
  useEffect(() => {
    if (targets && targets.length > 0 && !hasInitializedViewport) {
      const starts = targets.map(t => new Date(t.startDate).getTime());
      const minStart = new Date(Math.min(...starts));
      setViewportStart(new Date(minStart.getFullYear(), minStart.getMonth(), 1));
      setHasInitializedViewport(true);
    }
  }, [targets, hasInitializedViewport]);

  // Click outside to close menus
  useEffect(() => {
    const handleGlobalClick = () => {
      setShowViewMenu(false);
      setShowOverflowMenu(false);
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  // Dedicated ResizeObserver on the actual outermost gantt container to drive canvasWidthPx
  useEffect(() => {
    const container = ganttContainerRef.current;
    if (!container) return;

    const handleResize = (entries: ResizeObserverEntry[]) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (width > 0) {
          const actualCanvasWidth = showCompactStrip ? Math.max(100, width - 200) : width;
          setCanvasWidthPx(actualCanvasWidth);
        }
      }
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [showCompactStrip]);

  // Sync scroll left from body
  const handleHorizontalScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const sl = e.currentTarget.scrollLeft;
    setScrollLeft(sl);
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = sl;
    }
  }, []);

  // Non-passive wheel event listener to allow preventDefault for horizontal panning without browser warning
  useEffect(() => {
    const el = bodyHorizontalScrollRef.current;
    if (!el) return;

    const handleWheelNative = (e: WheelEvent) => {
      const isHorizontalSwipe = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      if (e.shiftKey || isHorizontalSwipe) {
        e.preventDefault();
        const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
        el.scrollLeft += delta;
      }
    };

    el.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => el.removeEventListener('wheel', handleWheelNative);
  }, []);

  // Keyboard navigation scroll controls (pages by one period width)
  const handleScrollLeft = () => {
    if (viewMode === 'Month' || viewMode === 'Week' || viewMode === 'Year') {
      setViewportStart(prev => new Date(prev.getFullYear() - 1, prev.getMonth(), prev.getDate()));
    } else if (viewMode === 'Quarter') {
      const qLen = quarterLength || 3;
      setViewportStart(prev => new Date(prev.getFullYear(), prev.getMonth() - qLen, prev.getDate()));
    } else {
      if (bodyHorizontalScrollRef.current) {
        bodyHorizontalScrollRef.current.scrollBy({ left: -colWidthPx, behavior: 'smooth' });
      }
    }
  };

  const handleScrollRight = () => {
    if (viewMode === 'Month' || viewMode === 'Week' || viewMode === 'Year') {
      setViewportStart(prev => new Date(prev.getFullYear() + 1, prev.getMonth(), prev.getDate()));
    } else if (viewMode === 'Quarter') {
      const qLen = quarterLength || 3;
      setViewportStart(prev => new Date(prev.getFullYear(), prev.getMonth() + qLen, prev.getDate()));
    } else {
      if (bodyHorizontalScrollRef.current) {
        bodyHorizontalScrollRef.current.scrollBy({ left: colWidthPx, behavior: 'smooth' });
      }
    }
  };

  // ── Date Scale Calculations ─────────────────────────────────────────────────
  const zoomConfigs = useMemo<Record<ViewMode, ZoomLevelConfig>>(() => ({
    Day: {
      unit: 'day',
      columnMinWidthPx: 32,
      alignment: 'none',
      defaultPeriodCount: 30,
    },
    Week: {
      unit: 'week',
      columnMinWidthPx: 70,
      alignment: 'calendarYear',
      defaultPeriodCount: 53,
    },
    Month: {
      unit: 'month',
      columnMinWidthPx: 100,
      alignment: 'calendarYear',
      defaultPeriodCount: 12,
    },
    Quarter: {
      unit: 'quarter',
      columnMinWidthPx: 120,
      alignment: 'calendarQuarter',
      defaultPeriodCount: 4,
      periodCount: quarterCount,
      periodLengthMonths: quarterLength,
    },
    Year: {
      unit: 'year',
      columnMinWidthPx: 150,
      alignment: 'calendarYear',
      defaultPeriodCount: 3,
    },
    Custom: {
      unit: 'custom',
      columnMinWidthPx: 100,
      alignment: 'none',
      defaultPeriodCount: 10,
      customStart,
      customEnd,
    }
  }), [quarterCount, quarterLength, customStart, customEnd]);

  // Full task range spanning full calendar year(s) from Week 1 (Jan 1) to Week 52 (Dec 31)
  const fullTaskRange = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    if (localTargets.length === 0) {
      // Provide 3 years of runway so users can plan ahead without hitting blank canvas
      return {
        start: new Date(currentYear - 1, 0, 1),
        end: new Date(currentYear + 2, 11, 31)
      };
    }
    const starts = localTargets.map(t => new Date(t.startDate).getFullYear());
    const ends = localTargets.map(t => new Date(t.deadline).getFullYear());
    const minYear = Math.min(...starts, currentYear);
    const maxYear = Math.max(...ends, currentYear);

    return {
      start: new Date(minYear, 0, 1),
      end: new Date(maxYear, 11, 31)
    };
  }, [localTargets]);

  // Single date scale computation
  const dateScale = useMemo(() => {
    const config = {
      ...zoomConfigs[viewMode],
      fullRange: fullTaskRange
    };
    return computeDateScale(config, viewportStart, canvasWidthPx);
  }, [viewMode, viewportStart, canvasWidthPx, zoomConfigs, fullTaskRange]);


  const colWidthPx = useMemo(() => {
    return dateScale.columns[0]?.widthPx ?? 100;
  }, [dateScale]);

  const totalTimelineWidth = useMemo(() => {
    return dateScale.columns.length * colWidthPx;
  }, [dateScale, colWidthPx]);

  const dateToX = useCallback((d: Date | string) => {
    const dateObj = typeof d === 'string' ? new Date(d) : d;
    const t = dateObj.getTime();
    const startMs = dateScale.rangeStart.getTime();
    const endMs = dateScale.rangeEnd.getTime();

    if (t <= startMs) return 0;
    if (t >= endMs) return dateScale.columns.length * colWidthPx;

    // Fast search using binary search
    let low = 0;
    let high = dateScale.columns.length - 1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      const col = dateScale.columns[mid];
      const colStartMs = col.start.getTime();
      const colEndMs = col.end.getTime();

      if (t >= colStartMs && t < colEndMs) {
        const fraction = (t - colStartMs) / (colEndMs - colStartMs);
        return col.xPx + fraction * col.widthPx;
      } else if (t < colStartMs) {
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }
    return 0;
  }, [dateScale, colWidthPx]);

  const xToDate = useCallback((x: number) => {
    const startMs = dateScale.rangeStart.getTime();
    const endMs = dateScale.rangeEnd.getTime();
    if (x <= 0) return new Date(startMs);
    const totalWidth = dateScale.columns.length * colWidthPx;
    if (x >= totalWidth) return new Date(endMs);

    const colIndex = Math.floor(x / colWidthPx);
    const col = dateScale.columns[colIndex];
    if (col) {
      const fraction = (x - col.xPx) / col.widthPx;
      const colDuration = col.end.getTime() - col.start.getTime();
      return new Date(col.start.getTime() + fraction * colDuration);
    }
    return new Date(startMs);
  }, [dateScale, colWidthPx]);

  // Today marker
  const todayX = useMemo(() => {
    const today = new Date();
    if (today < dateScale.rangeStart || today > dateScale.rangeEnd) return null;
    return dateToX(today);
  }, [dateScale.rangeStart, dateScale.rangeEnd, dateToX]);

  // Weekend Bands (disabled at Month/Quarter/Year coarser zooms)
  const weekendBands = useMemo(() => {
    const bands: Array<{ left: number; width: number }> = [];
    if (
      dateScale.resolvedUnit === 'month' ||
      dateScale.resolvedUnit === 'quarter' ||
      dateScale.resolvedUnit === 'year'
    ) {
      return bands;
    }

    const current = new Date(dateScale.rangeStart);
    while (current < dateScale.rangeEnd) {
      const day = current.getDay();
      if (day === 6 || day === 0) {
        const left = dateToX(current);
        const next = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1);
        const width = dateToX(next) - left;
        bands.push({ left, width });
      }
      current.setDate(current.getDate() + 1);
    }
    return bands;
  }, [dateScale, dateToX]);





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
    return list;
  }, [localTargets, filterRAG, filterMilestone, filterCriticalOnly]);

  // Auto-scroll to first search match on canvas
  useEffect(() => {
    if (!searchQuery.trim()) return;
    const q = searchQuery.toLowerCase();
    const matched = filteredTargets.find(t =>
      t.name.toLowerCase().includes(q) ||
      t.owner.toLowerCase().includes(q)
    );

    if (matched && bodyHorizontalScrollRef.current) {
      const x = dateToX(new Date(matched.startDate));
      bodyHorizontalScrollRef.current.scrollTo({
        left: x - 180,
        behavior: 'smooth'
      });
    }
  }, [searchQuery, filteredTargets, dateToX]);

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

  useEffect(() => {
    updateGhostRows();
  }, [showCompactStrip, updateGhostRows]);

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
    const unit = dateScale.resolvedUnit;
    if (unit === 'day') {
      result.setHours(0, 0, 0, 0);
    } else if (unit === 'week') {
      const day = result.getDay();
      result.setDate(result.getDate() - day);
      result.setHours(0, 0, 0, 0);
    } else if (unit === 'month') {
      result.setDate(1);
      result.setHours(0, 0, 0, 0);
    } else if (unit === 'quarter') {
      const qLen = quarterLength || 3;
      const idx = Math.floor(result.getMonth() / qLen);
      result.setMonth(idx * qLen, 1);
      result.setHours(0, 0, 0, 0);
    } else { // year
      result.setMonth(0, 1);
      result.setHours(0, 0, 0, 0);
    }
    return result;
  }, [dateScale.resolvedUnit, quarterLength]);

  // Initials for avatar rendering
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

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
      setQcVertical(rowGroupId || departments[0]?.name || '');

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
    const initialStartX = dateToX(initialStart);
    const initialEndX = dateToX(initialEnd);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;

      let updatedStart = initialStart;
      let updatedEnd = initialEnd;

      if (action === 'move') {
        const newStartX = initialStartX + deltaX;
        const duration = initialEnd.getTime() - initialStart.getTime();
        updatedStart = xToDate(newStartX);
        updatedEnd = new Date(updatedStart.getTime() + duration);
      } else if (action === 'resize') {
        const newEndX = initialEndX + deltaX;
        updatedEnd = xToDate(newEndX);
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

      let finalStart = initialStart;
      let finalEnd = initialEnd;

      if (action === 'move') {
        const newStartX = initialStartX + deltaX;
        const duration = initialEnd.getTime() - initialStart.getTime();
        finalStart = xToDate(newStartX);
        finalEnd = new Date(finalStart.getTime() + duration);
      } else if (action === 'resize') {
        const newEndX = initialEndX + deltaX;
        finalEnd = xToDate(newEndX);
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
  }, [localTargets, dateToX, xToDate, api, refresh, dependencySourceId]);

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
    setViewportStart(new Date());
    setTimeout(() => {
      if (bodyHorizontalScrollRef.current) {
        const today = new Date();
        const tx = dateToX(today);
        bodyHorizontalScrollRef.current.scrollTo({
          left: tx - bodyHorizontalScrollRef.current.clientWidth / 2,
          behavior: 'smooth'
        });
      }
    }, 50);
  }, [dateToX]);

  // Fit to tasks zoom-range escape hatch
  const handleFitToTasks = useCallback(() => {
    if (localTargets.length === 0) return;
    const starts = localTargets.map(t => new Date(t.startDate).getTime());
    const ends = localTargets.map(t => new Date(t.deadline).getTime());
    const minStart = Math.min(...starts);
    const maxEnd = Math.max(...ends);
    const duration = maxEnd - minStart;
    const padding = Math.max(7 * 24 * 60 * 60 * 1000, duration * 0.1); // ~10% padding (min 1 week)

    const start = new Date(minStart - padding);
    const end = new Date(maxEnd + padding);

    setCustomStart(start);
    setCustomEnd(end);
    setViewMode('Custom');
    if (bodyHorizontalScrollRef.current) {
      bodyHorizontalScrollRef.current.scrollLeft = 0;
    }
  }, [localTargets]);







  // Auto-scroll/auto-pan on initial load or zoom level change if default range is empty
  useEffect(() => {
    if (loading || localTargets.length === 0 || !bodyHorizontalScrollRef.current) return;

    const visibleStart = xToDate(0);
    const visibleEnd = xToDate(canvasWidthPx);

    const hasVisibleTasks = localTargets.some(t => {
      const tStart = new Date(t.startDate);
      const tEnd = new Date(t.deadline);
      return tStart <= visibleEnd && tEnd >= visibleStart;
    });

    if (!hasVisibleTasks) {
      const starts = localTargets.map(t => new Date(t.startDate).getTime());
      const minStart = new Date(Math.min(...starts));
      const today = new Date();

      const hasTasksNearToday = localTargets.some(t => {
        const tStart = new Date(t.startDate);
        const tEnd = new Date(t.deadline);
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        return tStart.getTime() <= today.getTime() + thirtyDays && tEnd.getTime() >= today.getTime() - thirtyDays;
      });

      const targetDate = hasTasksNearToday ? today : minStart;
      const tx = dateToX(targetDate);

      bodyHorizontalScrollRef.current.scrollTo({
        left: tx - canvasWidthPx / 2,
        behavior: 'auto'
      });
    }
  }, [localTargets, viewMode, canvasWidthPx, xToDate, dateToX, loading]);

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

  const handleCustomDatePickerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempCustomStart || !tempCustomEnd) return;
    const start = new Date(tempCustomStart);
    const end = new Date(tempCustomEnd);
    if (end <= start) {
      alert('End date must be after start date');
      return;
    }
    setCustomStart(start);
    setCustomEnd(end);
    setViewMode('Custom');
    setShowCustomDatePicker(false);
  };

  // ── Quick-Create Popover Submission ──────────────────────────────────────────
  const handleQuickCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCreate) return;
    setQcError(null);

    const targetVertical = qcVertical || departments[0]?.name || 'Sales';
    const targetOwner = qcOwner || user?.name || 'Super Admin';

    try {
      const res = await api.post('/targets', {
        name: qcName || (quickCreate.isMilestone ? 'New Milestone' : 'New Task'),
        vertical: targetVertical,
        owner: targetOwner,
        startDate: quickCreate.startDate.toISOString(),
        deadline: quickCreate.deadline.toISOString(),
        isMilestone: !!quickCreate.isMilestone,
        baseline: 0,
        targetValue: 100,
        currentValue: 0,
        unit: '%',
        direction: 'up'
      });

      if (res.data) {
        const newTarget = {
          ...res.data,
          dependencies: res.data.dependencies || [],
        };
        setLocalTargets((prev) => [...prev, newTarget]);
      }

      setQuickCreate(null);
      refresh();
    } catch (err: any) {
      console.error('Quick target creation failed:', err);
      const msg = err.response?.data?.message;
      const formatted = Array.isArray(msg) ? msg.join('; ') : (msg || err.message || 'Quick target creation failed');
      setQcError(formatted);
    }
  };

  // ── Open & Handle Target Progress Update Modal ────────────────────────────────
  const openEditTargetModal = (target: GanttTarget) => {
    setEditTargetModal(target);
    setEditValue(target.currentValue ?? 0);
    setEditStartDate(new Date(target.startDate).toISOString().split('T')[0]);
    setEditDeadline(new Date(target.deadline).toISOString().split('T')[0]);
    setEditError(null);
  };

  const handleEditTargetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTargetModal) return;
    setEditError(null);
    try {
      const targetVal = editTargetModal.targetValue || 100;
      const payload = {
        currentValue: Number(editValue),
        startDate: new Date(editStartDate).toISOString(),
        deadline: new Date(editDeadline).toISOString(),
        progressPct: targetVal > 0 ? (Number(editValue) / targetVal) * 100 : 0
      };

      await api.put(`/targets/${editTargetModal.id}`, payload);
      
      setLocalTargets((prev) =>
        prev.map((t) =>
          t.id === editTargetModal.id
            ? { ...t, ...payload, currentValue: Number(editValue) }
            : t
        )
      );
      setEditTargetModal(null);
      refresh();
    } catch (err: any) {
      console.error('Updating target progress failed:', err);
      const msg = err.response?.data?.message;
      const formatted = Array.isArray(msg) ? msg.join('; ') : (msg || err.message || 'Failed to update target');
      setEditError(formatted);
    } finally {
      setEditSaving(false);
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
    setQcOwner(user?.name || 'Super Admin');
    setQcVertical(rowGroupId || departments[0]?.name || 'Sales');
    setQcError(null);

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
      setShowViewMenu(false);
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
      const deps = t.dependencies || [];

      deps.forEach(d => {
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

  const totalCanvasHeight = (rows.length + ghostRows.length) * ROW_HEIGHT;

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
            <button
              className={`gantt-zoom-btn ${viewMode === 'Custom' ? 'active' : ''}`}
              onClick={() => setShowCustomDatePicker(true)}
              style={{ display: 'inline-flex', alignItems: 'center' }}
            >
              {viewMode === 'Custom' && customStart && customEnd ? (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span>
                    Custom: {customStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {customEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span
                    style={{
                      marginLeft: '8px',
                      padding: '2px 5px',
                      cursor: 'pointer',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.2)',
                      fontSize: '9px',
                      lineHeight: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewMode('Week');
                    }}
                  >
                    ✕
                  </span>
                </div>
              ) : (
                'Custom'
              )}
            </button>
          </div>
        </div>

        {/* Quarter view configurations (only when viewMode is Quarter) */}
        {viewMode === 'Quarter' && (
          <div className="gantt-toolbar-group" style={{ animation: 'fadeIn 0.2s' }}>
            <span className="gantt-toolbar-label">Quarters</span>
            <input
              type="number"
              className="gantt-select"
              style={{ width: '60px', padding: '0 6px', textAlign: 'center' }}
              min={1}
              max={24}
              value={quarterCount}
              onChange={(e) => setQuarterCount(Math.max(1, parseInt(e.target.value, 10) || 4))}
            />
            <span className="gantt-toolbar-label">Length</span>
            <select
              className="gantt-select"
              value={quarterLength}
              onChange={(e) => {
                const length = parseInt(e.target.value, 10);
                setQuarterLength(length);
                setViewportStart(new Date(viewportStart.getFullYear(), Math.floor(viewportStart.getMonth() / length) * length, 1));
              }}
            >
              <option value={1}>1 Month</option>
              <option value={2}>2 Months</option>
              <option value={3}>3 Months (Std)</option>
              <option value={4}>4 Months</option>
              <option value={6}>6 Months</option>
            </select>
          </div>
        )}

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

        {/* RAG Dropdown */}
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

        {/* View Options unified Dropdown to prevent screen cutoff */}
        <div className="gantt-toolbar-group" style={{ position: 'relative' }}>
          <button
            className={`gantt-toggle-btn ${showViewMenu ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setShowViewMenu(!showViewMenu);
            }}
            title="Configure timeline view variables"
          >
            <SlidersHorizontal size={13} />
            View Options
          </button>
          {showViewMenu && (
            <div className="gantt-dropdown-menu" onClick={(e) => e.stopPropagation()}>
              <div className="gantt-dropdown-item" onClick={() => setShowCritical(!showCritical)}>
                <input type="checkbox" checked={showCritical} readOnly />
                <span>Show Critical Path</span>
              </div>
              <div className="gantt-dropdown-item" onClick={() => setShowBaseline(!showBaseline)}>
                <input type="checkbox" checked={showBaseline} readOnly />
                <span>Show Baseline Overlay</span>
              </div>
              <div className="gantt-dropdown-item" onClick={() => setFilterMilestone(!filterMilestone)}>
                <input type="checkbox" checked={filterMilestone} readOnly />
                <span>Filter Milestones Only</span>
              </div>
              <div className="gantt-dropdown-item" onClick={() => setFilterCriticalOnly(!filterCriticalOnly)}>
                <input type="checkbox" checked={filterCriticalOnly} readOnly />
                <span>Filter Critical Only</span>
              </div>
              <div className="gantt-dropdown-item" onClick={() => setShowCompactStrip(!showCompactStrip)}>
                <input type="checkbox" checked={showCompactStrip} readOnly />
                <span>Show Left Index Strip</span>
              </div>
            </div>
          )}
        </div>

        {/* Actions & Scroll Navigation */}
        <div className="gantt-toolbar-group" style={{ marginLeft: 'auto', gap: '8px' }}>
          {/* Scroll Left Button */}
          <button className="gantt-action-btn" onClick={handleScrollLeft} title="Scroll Left (Year/Quarter or Period)">
            <ChevronLeft size={13} />
          </button>
          {/* Scroll Right Button */}
          <button className="gantt-action-btn" onClick={handleScrollRight} title="Scroll Right (Year/Quarter or Period)">
            <ChevronRight size={13} />
          </button>

          <button className="gantt-action-btn" onClick={handleJumpToday} title="Jump to Today">
            <RotateCcw size={13} />
            Today
          </button>

          <button className="gantt-action-btn" onClick={handleFitToTasks} title="Fit Zoom to encompass all Tasks">
            <Crosshair size={13} />
            Fit
          </button>

          {/* Overflow Menu for PNG, CSV, and Fullscreen Actions */}
          <div className="gantt-toolbar-group" style={{ position: 'relative' }}>
            <button
              className="gantt-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowOverflowMenu(!showOverflowMenu);
              }}
              title="Export and Screen actions"
              style={{ padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <SlidersHorizontal size={13} />
              <span>Actions</span>
              <ChevronDown size={11} />
            </button>
            {showOverflowMenu && (
              <div className="gantt-dropdown-menu" style={{ right: 0, top: '36px', zIndex: 100 }} onClick={() => setShowOverflowMenu(false)}>
                <div
                  className="gantt-dropdown-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExportPNG();
                    setShowOverflowMenu(false);
                  }}
                >
                  <Download size={13} />
                  <span>Export PNG</span>
                </div>
                <div
                  className="gantt-dropdown-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExportCSV();
                    setShowOverflowMenu(false);
                  }}
                >
                  <FileText size={13} />
                  <span>Export CSV</span>
                </div>
                <div
                  className="gantt-dropdown-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFullscreen();
                    setShowOverflowMenu(false);
                  }}
                >
                  {isFullscreen ? <Minimize size={13} /> : <Maximize size={13} />}
                  <span>{isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Gantt Grid Container */}
      <div className="gantt-container" ref={ganttContainerRef} onContextMenu={(e) => handleContextMenu(e)}>
        {/* Header Row */}
        <div className="gantt-header-row">
          {/* Optional Index Header segment */}
          {showCompactStrip && (
            <div
              className="gantt-compact-row"
              style={{
                width: '200px',
                position: 'sticky',
                left: 0,
                background: '#0f1019',
                borderRight: '1px solid var(--border-color)',
                zIndex: 25,
                fontWeight: 700,
                fontSize: '10px',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                height: '100%',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              Task Index
            </div>
          )}

          {/* Date scale (header) */}
          <div className="gantt-chart-header-scroll" ref={headerScrollRef} style={{ width: 0, flex: 1, minWidth: 0, overflowX: 'hidden' }}>
            <div className="gantt-chart-header-canvas" style={{ width: totalTimelineWidth }}>
              {dateScale.columns.map((col, idx) => (
                <div
                  key={idx}
                  className="gantt-chart-header-tick"
                  style={{ left: col.xPx, width: col.widthPx }}
                >
                  <span className="gantt-tick-label-top">{col.topLabel}</span>
                  <span className="gantt-tick-label-bottom">{col.bottomLabel}</span>
                </div>
              ))}
            </div>
          </div>
        </div>


        {/* Body Container — always rendered so the interactive canvas is always visible */}
        <div className="gantt-body-row" ref={bodyRowRef} style={{ width: '100%', overflow: 'hidden' }}>
            {/* Scrollable Canvas Body (contains optional left strip inside to scroll in perfect sync) */}
            <div
              className="gantt-chart-body-scroll"
              ref={bodyHorizontalScrollRef}
              onScroll={handleHorizontalScroll}
              onMouseDown={handleCanvasMouseDown}
              onMouseLeave={handleMouseLeave}
              style={{ width: 0, flex: 1, minWidth: 0, overflowX: 'auto', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', minHeight: '100%', width: totalTimelineWidth + (showCompactStrip ? 240 : 0) }}>
                {showCompactStrip && (
                  <div className="gantt-compact-strip">
                    {rows.map((row) => {
                      const isGroup = row.type === 'group';
                      const isGhost = row.type === 'ghost';
                      const active = row.target && searchQuery.trim() && (
                        row.target.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        row.target.owner.toLowerCase().includes(searchQuery.toLowerCase())
                      );

                      return (
                        <div
                          key={row.id}
                          className={`gantt-compact-row ${isGroup ? 'group-row' : ''} ${isGhost ? 'ghost-row' : ''}`}
                          style={{
                            height: ROW_HEIGHT,
                            background: active ? 'var(--color-primary-glow)' : undefined
                          }}
                          onClick={() => isGroup && handleGroupToggle(row.id)}
                        >
                          {!isGroup && !isGhost && row.target && (
                            <span
                              className={`badge-dot ${row.target.ragStatus.toLowerCase()}`}
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                display: 'inline-block',
                                background: `var(--color-rag-${row.target.ragStatus.toLowerCase()})`
                              }}
                            />
                          )}
                          <strong>{row.label}</strong>
                        </div>
                      );
                    })}

                    {/* Ghost index rows */}
                    {ghostRows.map((index) => (
                      <div
                        key={`ghost-index-${index}`}
                        className="gantt-compact-row ghost-row"
                        style={{ height: ROW_HEIGHT }}
                        onClick={(e) => hasEditAccess('Sales') && handleEmptyRowClick(e)}
                      >
                        <Plus size={10} style={{ opacity: 0.6 }} />
                        <span style={{ color: 'var(--text-muted)' }}>+ Add target...</span>
                      </div>
                    ))}
                  </div>
                )}

                <div
                  className="gantt-chart-body-canvas"
                  style={{
                    width: totalTimelineWidth,
                    height: totalCanvasHeight,
                    position: 'relative'
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
                          <span className="gantt-add-affordance-text" style={{ position: 'absolute', left: scrollLeft + 16, top: '13px' }}>
                            <Plus size={12} /> {row.label}
                          </span>

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
                      return (
                        <div
                          key={row.id}
                          className="gantt-chart-row group-row"
                          style={{
                            height: ROW_HEIGHT,
                            width: totalTimelineWidth
                          }}
                          onClick={() => handleGroupToggle(row.id)}
                        >
                          <div className="gantt-group-sticky-label" style={{ left: scrollLeft + 16 }}>
                            {collapsedGroups.has(row.id) ? (
                              <ChevronRight size={14} />
                            ) : (
                              <ChevronDown size={14} />
                            )}
                            <strong>{row.label}</strong>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'none', marginLeft: '8px' }}>
                              ({row.progress}% Rollup)
                            </span>
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

                    // Search highlight checks
                    const isSearchActive = searchQuery.trim().length > 0;
                    const isSearchMatch = isSearchActive && (
                      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      t.owner.toLowerCase().includes(searchQuery.toLowerCase())
                    );

                    // Label Rendering positions
                    const insideFits = barWidth > 180;
                    const leftRooms = xStart > scrollLeft + 200;

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
                        {/* Floating Label to the left of the bar */}
                        {!insideFits && leftRooms && (
                          <div
                            className="gantt-label-floating"
                            style={{
                              left: xStart - 190,
                              width: 180,
                              height: '100%',
                              justifyContent: 'flex-end',
                              color: isSearchActive && !isSearchMatch ? 'rgba(255,255,255,0.2)' : 'var(--text-primary)'
                            }}
                          >
                            <div className="gantt-avatar-badge" title={t.owner}>
                              {getInitials(t.owner)}
                            </div>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {t.name}
                            </span>
                          </div>
                        )}

                        {/* Sticky Floating Label pinned at viewport boundary if scrolled past bar start */}
                        {!insideFits && !leftRooms && xStart <= scrollLeft && xEnd > scrollLeft + 30 && (
                          <div
                            className="gantt-label-floating"
                            style={{
                              left: scrollLeft + 12,
                              height: '100%',
                              zIndex: 10,
                              background: 'rgba(17, 18, 24, 0.85)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color)',
                              color: isSearchActive && !isSearchMatch ? 'rgba(255,255,255,0.2)' : 'var(--text-primary)'
                            }}
                          >
                            <div className="gantt-avatar-badge" title={t.owner}>
                              {getInitials(t.owner)}
                            </div>
                            <span>{t.name}</span>
                          </div>
                        )}

                        {/* Floating Label to the right of the bar (if neither fits inside nor has space left) */}
                        {!insideFits && !leftRooms && xStart > scrollLeft && (
                          <div
                            className="gantt-label-floating"
                            style={{
                              left: xEnd + 8,
                              height: '100%',
                              color: isSearchActive && !isSearchMatch ? 'rgba(255,255,255,0.2)' : 'var(--text-primary)'
                            }}
                          >
                            <div className="gantt-avatar-badge" title={t.owner}>
                              {getInitials(t.owner)}
                            </div>
                            <span>{t.name}</span>
                          </div>
                        )}

                        {/* Bar rendering */}
                        {t.isMilestone ? (
                          <>
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
                            {/* Floating Right Label for milestones */}
                            <div
                              className="gantt-label-floating"
                              style={{
                                left: xStart + 12,
                                height: '100%',
                                color: isSearchActive && !isSearchMatch ? 'rgba(255,255,255,0.2)' : 'var(--text-primary)'
                              }}
                            >
                              <div className="gantt-avatar-badge" title={t.owner}>
                                {getInitials(t.owner)}
                              </div>
                              <span>{t.name}</span>
                            </div>
                          </>
                        ) : (
                          <div
                            className={`gantt-task-bar-wrapper ${isCritical ? 'critical' : ''} ${isSearchMatch ? 'search-match' : ''} ${isSearchActive && !isSearchMatch ? 'search-dimmed' : ''}`}
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

                              {/* Label Inside Bar (if it fits) */}
                              {insideFits && (
                                <div
                                  className="gantt-label-inside"
                                  style={{
                                    left: Math.max(6, Math.min(barWidth - 140, scrollLeft - xStart + 6))
                                  }}
                                >
                                  <div className="gantt-avatar-badge" title={t.owner}>
                                    {getInitials(t.owner)}
                                  </div>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {t.name} ({t.progressPct}%)
                                  </span>
                                </div>
                              )}

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
                              top: '31px',
                              height: '6px',
                              borderRadius: '2px',
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
                        <span className="gantt-add-affordance-text" style={{ position: 'absolute', left: scrollLeft + 16, top: '13px' }}>
                          <Plus size={12} /> + Add target...
                        </span>

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
          </div>

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
          {qcError && (
            <div style={{ padding: '6px 10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#f87171', fontSize: '12px', marginBottom: '12px' }}>
              {qcError}
            </div>
          )}
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
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
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
                  const targetToEdit = localTargets.find(t => t.id === contextMenu.targetId);
                  if (targetToEdit) openEditTargetModal(targetToEdit);
                  setContextMenu(null);
                }}
              >
                <Sliders size={12} /> Update Progress & Dates
              </div>
              <div
                className="gantt-context-menu-item"
                onClick={() => {
                  navigate(`/targets/${contextMenu.targetId}`);
                  setContextMenu(null);
                }}
              >
                <Edit2 size={12} /> View Full Target Details
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

      {/* Update Target Progress & Dates Modal */}
      {editTargetModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setEditTargetModal(null)}
        >
          <div
            style={{
              background: '#141520',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sliders size={20} style={{ color: '#60a5fa' }} />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
                  Update Progress & Dates
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditTargetModal(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditTargetSubmit} style={{ padding: '24px' }}>
              {editError && (
                <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#f87171', fontSize: '13px', marginBottom: '16px' }}>
                  {editError}
                </div>
              )}

              <div style={{ marginBottom: '20px', background: 'rgba(255,255,255,0.03)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Target Name</span>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>{editTargetModal.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {editTargetModal.vertical} • {editTargetModal.owner}
                </div>
              </div>

              {/* Progress Slider */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Completed Value ({editTargetModal.unit})
                  </label>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#60a5fa' }}>
                    {(editTargetModal.targetValue || 100) > 0 ? Math.min(100, Math.max(0, Math.round((editValue / (editTargetModal.targetValue || 100)) * 100))) : 0}% Completed
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                  <input
                    type="number"
                    required
                    min={0}
                    step="any"
                    value={editValue}
                    onChange={(e) => setEditValue(Number(e.target.value))}
                    style={{
                      width: '120px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: '#0d0e15',
                      color: '#ffffff',
                      fontSize: '16px',
                      fontWeight: 700,
                      outline: 'none'
                    }}
                  />
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>/ {editTargetModal.targetValue} {editTargetModal.unit}</span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={editTargetModal.targetValue || 100}
                  step={1}
                  value={editValue}
                  onChange={(e) => setEditValue(Number(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: '#3b82f6',
                    cursor: 'pointer'
                  }}
                />
              </div>

              {/* Start Date & Deadline */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: '#0d0e15',
                      color: '#ffffff',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Deadline
                  </label>
                  <input
                    type="date"
                    required
                    value={editDeadline}
                    onChange={(e) => setEditDeadline(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: '#0d0e15',
                      color: '#ffffff',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setEditTargetModal(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={editSaving}
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: editSaving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                    opacity: editSaving ? 0.7 : 1
                  }}
                >
                  {editSaving ? 'Saving...' : 'Save & Update Timeline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Date Range Picker Modal */}
      {showCustomDatePicker && (
        <div className="modal-overlay" onClick={() => setShowCustomDatePicker(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <span className="modal-title">Custom Date Range</span>
              <button className="modal-close" onClick={() => setShowCustomDatePicker(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCustomDatePickerSubmit}>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={tempCustomStart}
                    onChange={(e) => setTempCustomStart(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={tempCustomEnd}
                    onChange={(e) => setTempCustomEnd(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowCustomDatePicker(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Apply Range
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Legend Block */}
      <div className="gantt-legend" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
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
        </div>
        <div
          className="gantt-legend-info-hint"
          title="Right click canvas for context menu | Drag on empty rows to schedule | Press N to add target"
        >
          <Info size={12} style={{ flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Right click canvas for context menu | Drag on empty rows to schedule | Press N to add target
          </span>
        </div>
      </div>
    </div>
  );
};
