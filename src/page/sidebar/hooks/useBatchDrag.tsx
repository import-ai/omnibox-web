import { useEffect } from 'react';
import { useDragLayer } from 'react-dnd';
import { useTranslation } from 'react-i18next';

import ResourceTypeIcon from '@/components/resource-type-icon';

import type { TreeNode } from '../store';
import { useSidebarStore } from '../store';

interface BatchDragItem {
  type: 'batch';
  ids: string[];
  count: number;
  preview?: TreeNode;
}

interface CardDragItem extends TreeNode {
  type?: 'card';
}

type SidebarDragItem = BatchDragItem | CardDragItem;

export function SidebarDragLayer() {
  const { t } = useTranslation();
  const { isDragging, currentOffset, item } = useDragLayer(monitor => ({
    item: monitor.getItem() as SidebarDragItem | null,
    currentOffset: monitor.getClientOffset(),
    isDragging: monitor.isDragging(),
  }));
  const batchDragging = isDragging && item?.type === 'batch';
  const previewNode = item?.type === 'batch' ? item.preview : item;

  useEffect(() => {
    useSidebarStore.getState().setBatchDragging(batchDragging);
  }, [batchDragging]);

  if (!isDragging || !item || !previewNode || !currentOffset) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999]">
      <div
        style={{
          transform: `translate(${currentOffset.x}px, ${currentOffset.y}px)`,
        }}
        className="relative inline-flex min-w-40 max-w-72 items-center gap-2 rounded-md px-3 h-8 shadow-md bg-[rgba(226,226,230,0.5)]"
      >
        <ResourceTypeIcon
          expand={false}
          resource={{
            id: previewNode.id,
            name: previewNode.name,
            parentId: previewNode.parentId,
            resourceType: previewNode.resourceType,
            hasChildren: previewNode.hasChildren,
            attrs: previewNode.attrs,
          }}
        />
        <span className="min-w-0 flex-1 truncate text-sm">
          {previewNode.name || t('untitled')}
        </span>
        {item.type === 'batch' && (
          <span className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full text-xs text-primary-foreground bg-primary">
            {item.count}
          </span>
        )}
      </div>
    </div>
  );
}
