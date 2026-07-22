import React, { useRef, useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface GanttSideScrollBarProps {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  headerScrollRef?: React.RefObject<HTMLDivElement | null>;
  onScrollChange?: (newScrollLeft: number) => void;
  totalTimelineWidth: number;
}

export const GanttSideScrollBar: React.FC<GanttSideScrollBarProps> = ({
  scrollContainerRef,
  headerScrollRef,
  onScrollChange,
  totalTimelineWidth,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0); // 0 to 1
  const isDraggingRef = useRef(false);

  // Sync scroll position from container to scrollbar progress
  const updateProgressFromContainer = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) {
      setScrollProgress(0);
      return;
    }
    const currentProgress = Math.max(0, Math.min(1, el.scrollLeft / maxScroll));
    setScrollProgress(currentProgress);
  }, [scrollContainerRef]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    updateProgressFromContainer();

    const handleScroll = () => {
      if (!isDraggingRef.current) {
        updateProgressFromContainer();
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateProgressFromContainer);

    return () => {
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateProgressFromContainer);
    };
  }, [scrollContainerRef, updateProgressFromContainer, totalTimelineWidth]);

  // Set scrollLeft based on progress ratio (0 to 1)
  const applyScrollFromRatio = useCallback((ratio: number) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const newScrollLeft = Math.round(ratio * maxScroll);
    el.scrollLeft = newScrollLeft;
    if (headerScrollRef?.current) {
      headerScrollRef.current.scrollLeft = newScrollLeft;
    }
    if (onScrollChange) {
      onScrollChange(newScrollLeft);
    }
    setScrollProgress(ratio);
  }, [scrollContainerRef, headerScrollRef, onScrollChange]);

  const handleStepLeft = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const newScrollLeft = Math.max(0, el.scrollLeft - 200);
    el.scrollLeft = newScrollLeft;
    if (headerScrollRef?.current) {
      headerScrollRef.current.scrollLeft = newScrollLeft;
    }
    if (onScrollChange) {
      onScrollChange(newScrollLeft);
    }
    updateProgressFromContainer();
  };

  const handleStepRight = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const newScrollLeft = Math.min(maxScroll, el.scrollLeft + 200);
    el.scrollLeft = newScrollLeft;
    if (headerScrollRef?.current) {
      headerScrollRef.current.scrollLeft = newScrollLeft;
    }
    if (onScrollChange) {
      onScrollChange(newScrollLeft);
    }
    updateProgressFromContainer();
  };

  // Handle pointer down (click or drag start)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const track = trackRef.current;
    if (!track) return;

    isDraggingRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    const rect = track.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const ratio = rect.width > 0 ? offsetX / rect.width : 0;
    applyScrollFromRatio(ratio);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const track = trackRef.current;
    if (!track) return;

    const rect = track.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const ratio = rect.width > 0 ? offsetX / rect.width : 0;
    applyScrollFromRatio(ratio);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {
        // Ignore
      }
    }
  };

  return (
    <div
      style={{
        width: '100%',
        padding: '8px 16px',
        boxSizing: 'border-box',
        background: '#0d0e15',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        userSelect: 'none'
      }}
    >
      {/* Full Section Width Track Capsule with Arrows & Slider Handle (Image 2 Match) */}
      <div
        style={{
          width: '100%',
          height: '24px',
          background: '#141520',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 6px',
          boxSizing: 'border-box',
          position: 'relative'
        }}
      >
        {/* Left Arrow Button < */}
        <button
          type="button"
          onClick={handleStepLeft}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.6)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2px 4px',
            borderRadius: '50%',
            transition: 'color 0.15s ease',
            zIndex: 10
          }}
          title="Scroll Left"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Center Track Area (100% Full Width Span) */}
        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            flex: 1,
            height: '100%',
            position: 'relative',
            cursor: 'pointer',
            margin: '0 8px'
          }}
          title="Drag or click to scroll timeline"
        >
          {/* Slider Pill Handle with 3 Vertical Grip Lines (|||) */}
          <div
            style={{
              position: 'absolute',
              left: `${scrollProgress * 100}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '72px',
              height: '16px',
              borderRadius: '8px',
              background: 'linear-gradient(180deg, #2f3246 0%, #191a26 100%)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              cursor: 'grab',
              transition: isDraggingRef.current ? 'none' : 'left 0.05s ease-out',
              zIndex: 5
            }}
          >
            <div style={{ width: '2px', height: '8px', borderRadius: '1px', background: 'rgba(255, 255, 255, 0.4)' }} />
            <div style={{ width: '2px', height: '8px', borderRadius: '1px', background: 'rgba(255, 255, 255, 0.4)' }} />
            <div style={{ width: '2px', height: '8px', borderRadius: '1px', background: 'rgba(255, 255, 255, 0.4)' }} />
          </div>
        </div>

        {/* Right Arrow Button > */}
        <button
          type="button"
          onClick={handleStepRight}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.6)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2px 4px',
            borderRadius: '50%',
            transition: 'color 0.15s ease',
            zIndex: 10
          }}
          title="Scroll Right"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
