import {
  type RefObject,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { getEmptyImage, NativeTypes } from 'react-dnd-html5-backend';

import { isSmartFolderChildResource } from '@/page/sidebar/components/smart-folder';

import type { TreeNode } from '../store';
import { useSidebarStore } from '../store';
import {
  calculateSelectedCount,
  getDescendantIds,
  getTopLevelSelectedIds,
  isDescendant,
} from '../store/utils';
import {
  DndItem,
  isDisabledBatchDropTarget,
  useDndHandlers,
} from './useDndHandlers';

interface UseResourceNodeDndOptions {
  namespaceId: string;
  onNodeDrop?: (dragId: string, dropId: string) => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  selectedIds?: string[];
}

interface UseResourceNodeDndReturn {
  dragRef: RefObject<HTMLDivElement | null>;
  dropRef: RefObject<HTMLDivElement | null>;
  dragStyle: { opacity: number };
  isOver: boolean;
  isDisabledOver: boolean;
  isFileDragOver: boolean;
}

export function useResourceNodeDnd(
  nodeId: string,
  node: TreeNode,
  isEditing: boolean,
  options: UseResourceNodeDndOptions
): UseResourceNodeDndReturn {
  const {
    namespaceId,
    onNodeDrop,
    selectionMode = false,
    isSelected = false,
    selectedIds = [],
  } = options;

  const dragRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const nodes = useSidebarStore(state => state.nodes);
  const selectedMap = useSidebarStore(state => state.selectedIds);
  const batchDragging = useSidebarStore(state => state.batchDragging);
  const batchIds = useMemo(
    () => getTopLevelSelectedIds(nodes, selectedIds),
    [nodes, selectedIds]
  );
  const batchCount = useMemo(
    () => calculateSelectedCount(nodes, selectedMap),
    [nodes, selectedMap]
  );
  const disabledBatchTargetIds = useMemo(() => {
    const ids = new Set<string>();
    for (const id of batchIds) {
      ids.add(id);
      for (const descendantId of getDescendantIds(nodes, id)) {
        ids.add(descendantId);
      }
    }
    return Array.from(ids);
  }, [batchIds, nodes]);

  const canDropItem = (item: DndItem) => {
    const targetNode = nodes[nodeId];
    if (targetNode?.resourceType === 'smart_folder') {
      return false;
    }
    if (isSmartFolderChildResource(targetNode)) {
      return false;
    }

    if (item.id) {
      const dragNode = nodes[item.id];
      if (isSmartFolderChildResource(dragNode)) {
        return false;
      }
      if (
        dragNode?.resourceType &&
        targetNode?.resourceType &&
        (dragNode.resourceType === 'smart_folder') !==
          (targetNode.resourceType === 'smart_folder')
      ) {
        return false;
      }
      return item.id !== nodeId && !isDescendant(nodes, item.id, nodeId);
    }

    if (item.ids?.length) {
      if (isDisabledBatchDropTarget(nodes, item, nodeId)) {
        return false;
      }
      const topLevelIds = getTopLevelSelectedIds(nodes, item.ids);
      return topLevelIds.every(
        id => id !== nodeId && !isDescendant(nodes, id, nodeId)
      );
    }

    return true;
  };

  const { handleDrop, handleHover, isFileDragOver, clearFileDragTarget } =
    useDndHandlers({
      targetId: nodeId,
      namespaceId,
      onNodeDrop,
    });

  const [dragStyle, drag, preview] = useDrag(
    {
      type: 'card',
      item: () => {
        if (!selectionMode || !isSelected) {
          return node;
        }
        return {
          type: 'batch',
          ids: batchIds,
          disabledTargetIds: disabledBatchTargetIds,
          count: batchCount,
          preview: node,
        };
      },
      canDrag: () =>
        !isEditing &&
        (!selectionMode || isSelected) &&
        node.resourceType !== 'smart_folder' &&
        !isSmartFolderChildResource(node),
      collect: monitor => ({
        opacity: monitor.isDragging() ? 0.5 : 1,
      }),
    },
    [
      batchCount,
      batchIds,
      disabledBatchTargetIds,
      isEditing,
      isSelected,
      node,
      selectionMode,
    ]
  );

  const [{ isOver, isDisabledOver }, drop] = useDrop<
    DndItem,
    void,
    { isOver: boolean; isDisabledOver: boolean }
  >({
    accept: ['card', NativeTypes.FILE],
    canDrop: item => canDropItem(item),
    collect: monitor => {
      const item = monitor.getItem() as DndItem | null;
      const isCardOver =
        monitor.getItemType() === 'card' && monitor.isOver({ shallow: false });
      const isBatchDisabledTarget =
        isCardOver &&
        Boolean(item?.ids?.length) &&
        isDisabledBatchDropTarget(nodes, item, nodeId);
      return {
        isOver: monitor.isOver({ shallow: true }) && monitor.canDrop(),
        isDisabledOver:
          isBatchDisabledTarget ||
          (isCardOver && item !== null && !canDropItem(item)),
      };
    },
    hover: (item, monitor) => {
      if (!dropRef.current) return;
      if (!canDropItem(item)) return;
      handleHover(item, monitor);
    },
    drop: (item, monitor) => {
      if (!canDropItem(item)) return;
      handleDrop(item, monitor);
    },
  });
  const isBatchDisabledOver =
    batchDragging && disabledBatchTargetIds.includes(nodeId);

  useLayoutEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: false });
  }, [preview]);

  useEffect(() => {
    drag(dragRef);
    drop(dropRef);
  }, [drag, drop]);

  useEffect(() => {
    if (!isOver && isFileDragOver) {
      clearFileDragTarget();
    }
  }, [isOver, isFileDragOver, clearFileDragTarget]);

  return {
    dragRef,
    dropRef,
    dragStyle,
    isOver,
    isDisabledOver: isDisabledOver || isBatchDisabledOver,
    isFileDragOver,
  };
}
