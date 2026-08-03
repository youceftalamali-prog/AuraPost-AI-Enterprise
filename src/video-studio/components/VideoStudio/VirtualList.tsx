import React, { useCallback, useMemo, useRef, useState } from 'react';

interface VirtualListProps<T> {
  items: T[];
  rowHeight: number;
  height: number;
  overscan?: number;
  renderRow: (item: T, index: number) => React.ReactNode;
  getKey: (item: T, index: number) => string;
}

/**
 * Lightweight windowed list — renders only the visible rows. Keeps the
 * History / Queue DOM small even with hundreds of items.
 */
export function VirtualList<T>({
  items,
  rowHeight,
  height,
  overscan = 5,
  renderRow,
  getKey,
}: VirtualListProps<T>): React.ReactElement {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const onScroll = useCallback(() => {
    if (containerRef.current) setScrollTop(containerRef.current.scrollTop);
  }, []);

  const { startIndex, visibleItems } = useMemo(() => {
    const total = items.length;
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const visibleCount = Math.ceil(height / rowHeight) + overscan * 2;
    const end = Math.min(total, start + visibleCount);
    return { startIndex: start, visibleItems: items.slice(start, end) };
  }, [items, scrollTop, rowHeight, height, overscan]);

  const totalHeight = items.length * rowHeight;
  const offsetY = startIndex * rowHeight;

  return (
    <div ref={containerRef} onScroll={onScroll} style={{ height, overflowY: 'auto', position: 'relative' }}>
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, i) => {
            const index = startIndex + i;
            return (
              <div key={getKey(item, index)} style={{ height: rowHeight }}>
                {renderRow(item, index)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}