import React from 'react';
import { ViewMode } from 'gantt-task-react';
import {
  ZoomIn, Layers, GitBranch,
  BookMarked, Download, FileText, Search,
  RotateCcw, SlidersHorizontal
} from 'lucide-react';

export type GroupBy = 'none' | 'vertical' | 'owner';
export type FilterRAG = 'ALL' | 'GREEN' | 'AMBER' | 'RED';

interface GanttToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  groupBy: GroupBy;
  onGroupByChange: (g: GroupBy) => void;
  showCritical: boolean;
  onToggleCritical: () => void;
  showBaseline: boolean;
  onToggleBaseline: () => void;
  filterRAG: FilterRAG;
  onFilterRAG: (f: FilterRAG) => void;
  filterMilestone: boolean;
  onFilterMilestone: () => void;
  filterCriticalOnly: boolean;
  onFilterCriticalOnly: () => void;
  searchQuery: string;
  onSearch: (q: string) => void;
  onJumpToday: () => void;
  onExportPNG: () => void;
  onExportCSV: () => void;
}

const VIEW_MODES: Array<{ label: string; value: ViewMode }> = [
  { label: 'Day', value: ViewMode.Day },
  { label: 'Week', value: ViewMode.Week },
  { label: 'Month', value: ViewMode.Month },
  { label: 'QuarterDay', value: ViewMode.QuarterDay },
  { label: 'Year', value: ViewMode.Year },
];

export const GanttToolbar: React.FC<GanttToolbarProps> = ({
  viewMode,
  onViewModeChange,
  groupBy,
  onGroupByChange,
  showCritical,
  onToggleCritical,
  showBaseline,
  onToggleBaseline,
  filterRAG,
  onFilterRAG,
  filterMilestone,
  onFilterMilestone,
  filterCriticalOnly,
  onFilterCriticalOnly,
  searchQuery,
  onSearch,
  onJumpToday,
  onExportPNG,
  onExportCSV,
}) => {
  return (
    <div className="gantt-toolbar">
      {/* Left: Search */}
      <div className="gantt-toolbar-group">
        <div className="gantt-search-wrap">
          <Search size={14} className="gantt-search-icon" />
          <input
            className="gantt-search-input"
            type="text"
            placeholder="Search tasks…"
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Center: Zoom */}
      <div className="gantt-toolbar-group">
        <span className="gantt-toolbar-label">
          <ZoomIn size={13} /> Zoom
        </span>
        <div className="gantt-btn-group">
          {VIEW_MODES.map((m) => (
            <button
              key={m.value}
              className={`gantt-zoom-btn ${viewMode === m.value ? 'active' : ''}`}
              onClick={() => onViewModeChange(m.value)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Group by */}
      <div className="gantt-toolbar-group">
        <span className="gantt-toolbar-label">
          <Layers size={13} /> Group
        </span>
        <select
          className="gantt-select"
          value={groupBy}
          onChange={(e) => onGroupByChange(e.target.value as GroupBy)}
        >
          <option value="none">None</option>
          <option value="vertical">Vertical</option>
          <option value="owner">Owner</option>
        </select>
      </div>

      {/* RAG filter */}
      <div className="gantt-toolbar-group">
        <span className="gantt-toolbar-label">
          <SlidersHorizontal size={13} /> RAG
        </span>
        <select
          className="gantt-select"
          value={filterRAG}
          onChange={(e) => onFilterRAG(e.target.value as FilterRAG)}
        >
          <option value="ALL">All</option>
          <option value="GREEN">Green</option>
          <option value="AMBER">Amber</option>
          <option value="RED">Red</option>
        </select>
      </div>

      {/* Toggles */}
      <div className="gantt-toolbar-group">
        <button
          className={`gantt-toggle-btn ${showCritical ? 'active critical' : ''}`}
          onClick={onToggleCritical}
          title="Highlight critical path"
        >
          <GitBranch size={13} />
          Critical Path
        </button>
        <button
          className={`gantt-toggle-btn ${showBaseline ? 'active' : ''}`}
          onClick={onToggleBaseline}
          title="Show baseline overlay"
        >
          <BookMarked size={13} />
          Baseline
        </button>
        <button
          className={`gantt-toggle-btn ${filterMilestone ? 'active' : ''}`}
          onClick={onFilterMilestone}
          title="Show milestones only"
        >
          ◆ Milestones
        </button>
        <button
          className={`gantt-toggle-btn ${filterCriticalOnly ? 'active critical' : ''}`}
          onClick={onFilterCriticalOnly}
          title="Show critical path tasks only"
        >
          Critical Only
        </button>
      </div>

      {/* Right: Actions */}
      <div className="gantt-toolbar-group">
        <button className="gantt-action-btn" onClick={onJumpToday} title="Jump to today">
          <RotateCcw size={13} />
          Today
        </button>
        <button className="gantt-action-btn" onClick={onExportPNG} title="Export as PNG">
          <Download size={13} />
          PNG
        </button>
        <button className="gantt-action-btn" onClick={onExportCSV} title="Export as CSV">
          <FileText size={13} />
          CSV
        </button>
      </div>
    </div>
  );
};
