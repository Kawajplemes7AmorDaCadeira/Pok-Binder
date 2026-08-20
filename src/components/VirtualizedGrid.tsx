import React, { useState, useEffect, useRef, useMemo } from 'react';

interface VirtualizedGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string;
  gap?: number; // Gap between grid items in pixels
}

export function VirtualizedGrid<T>({
  items,
  renderItem,
  keyExtractor,
  gap = 16,
}: VirtualizedGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(800);

  // 1. Monitor container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    setContainerWidth(el.clientWidth);

    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const rect = entries[0].contentRect;
      setContainerWidth(rect.width || el.clientWidth);
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 2. Monitor window scroll & viewport height
  useEffect(() => {
    const handleScroll = () => {
      setScrollTop(window.scrollY);
    };

    const handleResize = () => {
      setViewportHeight(window.innerHeight);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    
    // Initial values
    setScrollTop(window.scrollY);
    setViewportHeight(window.innerHeight);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 3. Determine columns and row height dynamically
  const { columns, rowHeight } = useMemo(() => {
    let cols = 2;
    if (containerWidth >= 1024) {
      cols = 6;
    } else if (containerWidth >= 768) {
      cols = 4;
    } else if (containerWidth >= 640) {
      cols = 3;
    }

    // Grid gap adjustment for column width calculation
    const totalGapsWidth = gap * (cols - 1);
    const colWidth = Math.max(100, (containerWidth - totalGapsWidth) / cols);
    
    // Height is card aspect ratio 3/4 (height = width * 4/3) plus card margins, padding, and text footer
    const cardHeight = colWidth * (4 / 3);
    const infoFooterHeight = 62; // Height in pixels for card name + set details
    const paddingAndBorders = 24; // Padding inside cards and margins
    const rHeight = cardHeight + infoFooterHeight + paddingAndBorders;

    return { columns: cols, rowHeight: rHeight };
  }, [containerWidth, gap]);

  // 4. Group items into rows
  const rows = useMemo(() => {
    const r: T[][] = [];
    for (let i = 0; i < items.length; i += columns) {
      r.push(items.slice(i, i + columns));
    }
    return r;
  }, [items, columns]);

  // 5. Calculate visible range of rows
  const { startRow, endRow } = useMemo(() => {
    const container = containerRef.current;
    if (!container) {
      return { startRow: 0, endRow: Math.min(5, rows.length) };
    }

    // Find container top position relative to page
    const rect = container.getBoundingClientRect();
    const containerPageTop = rect.top + window.scrollY;

    // Scroll offset relative to the start of the container
    const relativeScrollTop = Math.max(0, scrollTop - containerPageTop);

    // Number of rows above the visible viewport
    const rawStartRow = Math.floor(relativeScrollTop / rowHeight);
    // Number of rows that fit in the viewport
    const visibleRowCount = Math.ceil(viewportHeight / rowHeight);

    // Add 2 buffer rows above and 3 buffer rows below
    const start = Math.max(0, rawStartRow - 2);
    const end = Math.min(rows.length, rawStartRow + visibleRowCount + 3);

    return { startRow: start, endRow: end };
  }, [scrollTop, viewportHeight, rowHeight, rows.length]);

  // Height of empty space before and after the visible rows
  const paddingTop = startRow * rowHeight;
  const paddingBottom = Math.max(0, (rows.length - endRow) * rowHeight);

  // Render visible rows
  const visibleRows = useMemo(() => {
    return rows.slice(startRow, endRow);
  }, [rows, startRow, endRow]);

  return (
    <div ref={containerRef} className="w-full" style={{ minHeight: `${rows.length * rowHeight}px` }}>
      {paddingTop > 0 && <div style={{ height: `${paddingTop}px` }} />}
      
      <div 
        className="grid" 
        style={{ 
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          columnGap: `${gap}px`,
          rowGap: `${gap}px`
        }}
      >
        {visibleRows.flatMap((row, rIndex) => {
          const globalRowIndex = startRow + rIndex;
          return row.map((item, colIndex) => {
            const globalIndex = globalRowIndex * columns + colIndex;
            return (
              <div key={keyExtractor(item)}>
                {renderItem(item, globalIndex)}
              </div>
            );
          });
        })}
      </div>

      {paddingBottom > 0 && <div style={{ height: `${paddingBottom}px` }} />}
    </div>
  );
}
