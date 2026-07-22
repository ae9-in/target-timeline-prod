import React from 'react';

interface GanttScrubberProps {
  rangeStartDate: Date;      // earliest date across the full task set (with padding)
  rangeEndDate: Date;        // latest date across the full task set (with padding)
  visibleStartDate: Date;    // current left edge of what the main canvas shows
  visibleWindowDays: number; // how many days wide the current visible window is
  onScrub: (newVisibleStartDate: Date) => void; // called continuously while dragging
  taskMarkers: { startOffsetDays: number; widthDays: number; color: string }[]; // for the colored background segments
  todayOffsetDays: number;
}

export function GanttScrubber({
  rangeStartDate,
  rangeEndDate,
  visibleStartDate,
  visibleWindowDays,
  onScrub,
  taskMarkers,
  todayOffsetDays,
}: GanttScrubberProps) {
  const totalDays = Math.max(
    1,
    Math.round((rangeEndDate.getTime() - rangeStartDate.getTime()) / 86400000)
  );
  const maxScrubValue = Math.max(0, totalDays - visibleWindowDays);
  const currentValue = Math.round(
    (visibleStartDate.getTime() - rangeStartDate.getTime()) / 86400000
  );

  const handleChange = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    const newOffsetDays = Number(target.value);
    const newDate = new Date(rangeStartDate.getTime() + newOffsetDays * 86400000);
    onScrub(newDate);
  };

  const windowWidthPct = (visibleWindowDays / totalDays) * 100;
  const windowLeftPct = (currentValue / totalDays) * 100;



  return (
    <div className="gantt-scrubber">
      <div className="gantt-scrubber-track">
        {taskMarkers.map((m, i) => (
          <div
            key={i}
            className="gantt-scrubber-marker"
            style={{
              left: `${(m.startOffsetDays / totalDays) * 100}%`,
              width: `${(m.widthDays / totalDays) * 100}%`,
              background: m.color,
            }}
          />
        ))}
        <div
          className="gantt-scrubber-today"
          style={{ left: `${(todayOffsetDays / totalDays) * 100}%` }}
        />
        <div
          className="gantt-scrubber-window"
          style={{ left: `${windowLeftPct}%`, width: `${windowWidthPct}%` }}
        />
      </div>
      <input
        type="range"
        className="gantt-scrubber-input"
        min={0}
        max={maxScrubValue}
        step={1}
        value={Math.min(currentValue, maxScrubValue)}
        onChange={handleChange}
        onInput={handleChange}
        aria-label="Scrub timeline"
      />
    </div>
  );
}
