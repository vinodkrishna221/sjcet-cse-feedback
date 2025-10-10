/**
 * Virtual Scrolling List Component for performance with large datasets
 */
import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { cn } from '../../lib/utils';

export interface VirtualListProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  renderItem: (props: { index: number; style: React.CSSProperties; item: T }) => React.ReactNode;
  className?: string;
  overscanCount?: number;
  onItemsRendered?: (props: { startIndex: number; stopIndex: number }) => void;
  onScroll?: (props: { scrollDirection: 'forward' | 'backward'; scrollOffset: number }) => void;
  loading?: boolean;
  emptyMessage?: string;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
}

export function VirtualList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  className,
  overscanCount = 5,
  onItemsRendered,
  onScroll,
  loading = false,
  emptyMessage = "No items to display",
  loadingComponent,
  emptyComponent,
}: VirtualListProps<T>) {
  const listRef = useRef<List>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  const handleItemsRendered = useCallback((props: { startIndex: number; stopIndex: number }) => {
    onItemsRendered?.(props);
  }, [onItemsRendered]);

  const handleScroll = useCallback((props: { scrollDirection: 'forward' | 'backward'; scrollOffset: number }) => {
    setIsScrolling(true);
    onScroll?.(props);
    
    // Reset scrolling state after a delay
    setTimeout(() => setIsScrolling(false), 150);
  }, [onScroll]);

  const itemData = useMemo(() => ({
    items,
    renderItem,
  }), [items, renderItem]);

  const ItemRenderer = useCallback(({ index, style, data }: { 
    index: number; 
    style: React.CSSProperties; 
    data: { items: T[]; renderItem: (props: { index: number; style: React.CSSProperties; item: T }) => React.ReactNode };
  }) => {
    const item = data.items[index];
    if (!item) return null;
    
    return data.renderItem({ index, style, item });
  }, []);

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center", className)} style={{ height }}>
        {loadingComponent || (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
            <p className="text-gray-500">Loading...</p>
          </div>
        )}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={cn("flex items-center justify-center", className)} style={{ height }}>
        {emptyComponent || (
          <div className="text-center">
            <p className="text-gray-500">{emptyMessage}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <List
        ref={listRef}
        height={height}
        itemCount={items.length}
        itemSize={itemHeight}
        itemData={itemData}
        overscanCount={overscanCount}
        onItemsRendered={handleItemsRendered}
        onScroll={handleScroll}
        className={cn(
          "scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600",
          isScrolling && "scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-500"
        )}
      />
    </div>
  );
}

// Hook for virtual list with search and filtering
export function useVirtualList<T>(
  items: T[],
  searchTerm: string = '',
  searchFields: (keyof T)[] = [],
  itemHeight: number = 50
) {
  const [filteredItems, setFilteredItems] = useState<T[]>(items);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredItems(items);
      return;
    }

    const filtered = items.filter(item => {
      return searchFields.some(field => {
        const value = item[field];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(searchTerm.toLowerCase());
        }
        if (typeof value === 'number') {
          return value.toString().includes(searchTerm);
        }
        return false;
      });
    });

    setFilteredItems(filtered);
  }, [items, searchTerm, searchFields]);

  const scrollToItem = useCallback((index: number, listRef: React.RefObject<List>) => {
    if (listRef.current) {
      listRef.current.scrollToItem(index, 'start');
    }
  }, []);

  const scrollToTop = useCallback((listRef: React.RefObject<List>) => {
    if (listRef.current) {
      listRef.current.scrollTo(0);
    }
  }, []);

  return {
    filteredItems,
    scrollToItem,
    scrollToTop,
  };
}

// Virtual Grid Component
export interface VirtualGridProps<T> {
  items: T[];
  height: number;
  width: number;
  itemHeight: number;
  itemWidth: number;
  renderItem: (props: { 
    index: number; 
    style: React.CSSProperties; 
    item: T;
    rowIndex: number;
    columnIndex: number;
  }) => React.ReactNode;
  className?: string;
  overscanCount?: number;
  gap?: number;
}

export function VirtualGrid<T>({
  items,
  height,
  width,
  itemHeight,
  itemWidth,
  renderItem,
  className,
  overscanCount = 5,
  gap = 8,
}: VirtualGridProps<T>) {
  const columnsPerRow = Math.floor((width + gap) / (itemWidth + gap));
  const rowCount = Math.ceil(items.length / columnsPerRow);

  const itemData = useMemo(() => ({
    items,
    renderItem,
    columnsPerRow,
    itemHeight,
    itemWidth,
    gap,
  }), [items, renderItem, columnsPerRow, itemHeight, itemWidth, gap]);

  const RowRenderer = useCallback(({ index, style, data }: { 
    index: number; 
    style: React.CSSProperties; 
    data: { 
      items: T[]; 
      renderItem: (props: { 
        index: number; 
        style: React.CSSProperties; 
        item: T;
        rowIndex: number;
        columnIndex: number;
      }) => React.ReactNode;
      columnsPerRow: number;
      itemHeight: number;
      itemWidth: number;
      gap: number;
    };
  }) => {
    const startIndex = index * data.columnsPerRow;
    const endIndex = Math.min(startIndex + data.columnsPerRow, data.items.length);
    const rowItems = data.items.slice(startIndex, endIndex);

    return (
      <div style={style} className="flex" style={{ gap: data.gap }}>
        {rowItems.map((item, columnIndex) => {
          const itemIndex = startIndex + columnIndex;
          const itemStyle = {
            width: data.itemWidth,
            height: data.itemHeight,
          };

          return data.renderItem({
            index: itemIndex,
            style: itemStyle,
            item,
            rowIndex: index,
            columnIndex,
          });
        })}
      </div>
    );
  }, []);

  return (
    <div className={cn("relative", className)}>
      <List
        height={height}
        itemCount={rowCount}
        itemSize={itemHeight + gap}
        itemData={itemData}
        overscanCount={overscanCount}
        className="scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
      >
        {RowRenderer}
      </List>
    </div>
  );
}

export default VirtualList;
