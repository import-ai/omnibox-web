import { useMemo } from 'react';
import { useDrag, useDragLayer } from 'react-dnd';
import { useTranslation } from 'react-i18next';

import { useSidebarStore } from '../store';

export interface BatchDragItem {
  type: 'batch';
  ids: string[];
  count: number;
}

interface UseBatchDragOptions {
  selectionMode: boolean;
  isSelected: boolean;
}

export function useBatchDrag({
  selectionMode,
  isSelected,
}: UseBatchDragOptions) {
  const selectedIds = useSidebarStore(state => state.selectedIds);
  const canDrag = selectionMode && isSelected;
  const dragItem = useMemo<BatchDragItem>(
    () => ({
      type: 'batch',
      ids: Object.keys(selectedIds),
      count: Object.keys(selectedIds).length,
    }),
    [selectedIds]
  );

  const [{ isDragging }, drag] = useDrag(
    {
      type: 'batch',
      item: () => (canDrag ? dragItem : null),
      canDrag: () => canDrag,
      collect: monitor => ({
        isDragging: monitor.isDragging(),
      }),
    },
    [canDrag, dragItem]
  );

  return { isDragging, drag };
}

export function BatchDragLayer() {
  const { t } = useTranslation();
  const { isDragging, currentOffset, item } = useDragLayer(monitor => ({
    item: monitor.getItem() as BatchDragItem | null,
    currentOffset: monitor.getClientOffset(),
    isDragging: monitor.isDragging(),
  }));

  if (!isDragging || !item || item.type !== 'batch' || !currentOffset) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999]">
      <div
        style={{
          transform: `translate(${currentOffset.x}px, ${currentOffset.y}px)`,
        }}
        className="inline-flex items-center gap-2 rounded-md border bg-background p-3 opacity-85 shadow-lg"
      >
        <span className="rounded-md bg-primary/10 px-2 py-1 text-sm font-medium text-primary">
          {item.count}
        </span>
        <span className="text-sm text-muted-foreground">
          {t('batch.dragging_count', { count: item.count })}
        </span>
      </div>
    </div>
  );
}
