import { type RefObject, useEffect, useMemo, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { getEmptyImage, NativeTypes } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { isSmartFolderChildResource } from '@/page/sidebar/components/smart-folder';

import { useSidebarStore } from '../store';
import type { TreeNode } from '../store/types';
import {
  calculateSelectedCount,
  getDescendantIds,
  getTopLevelSelectedIds,
  isDescendant,
  isManagedChildrenNode,
} from '../store/utils';
import {
  type DndItem,
  isDisabledBatchDropTarget,
  useDndHandlers,
} from './useDndHandlers';
import { useManualResourceDrop } from './useManualResourceDrop';

interface UseResourceNodeDndOptions {
  namespaceId: string;
  depth: number;
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
  isInsideDrop: boolean;
}

export function useResourceNodeDnd(
  nodeId: string,
  node: TreeNode,
  isEditing: boolean,
  options: UseResourceNodeDndOptions
): UseResourceNodeDndReturn {
  const { t } = useTranslation();
  const {
    namespaceId,
    depth,
    onNodeDrop,
    selectionMode = false,
    isSelected = false,
    selectedIds = [],
  } = options;

  const dragRef = useRef<HTMLDivElement>(null);
  const nodes = useSidebarStore(state => state.nodes);
  const selectedMap = useSidebarStore(state => state.selectedIds);
  const batchDragging = useSidebarStore(state => state.batchDragging);
  const {
    dropRef,
    isInsideDrop,
    updateDropPosition,
    getDropState,
    resetDropState,
  } = useManualResourceDrop({ depth, nodeId, nodes });
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
    if (isSmartFolderChildResource(targetNode)) {
      return false;
    }

    if (item.id) {
      if (item.id === nodeId) {
        return true;
      }

      const dragNode = nodes[item.id];
      if (isSmartFolderChildResource(dragNode)) {
        return false;
      }
      if (
        dragNode?.resourceType === 'smart_folder' &&
        dragNode.parentId !== targetNode?.parentId
      ) {
        return false;
      }
      return !item.disabledTargetIdSet?.has(nodeId);
    }

    if (item.ids?.length) {
      if (isManagedChildrenNode(targetNode)) {
        return false;
      }
      if (isDisabledBatchDropTarget(nodes, item, nodeId)) {
        return false;
      }
      const topLevelIds = getTopLevelSelectedIds(nodes, item.ids);
      return topLevelIds.every(
        id => id !== nodeId && !isDescendant(nodes, id, nodeId)
      );
    }

    return !isManagedChildrenNode(targetNode);
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
          const currentNodes = useSidebarStore.getState().nodes;
          return {
            ...node,
            depth,
            type: 'card' as const,
            disabledTargetIdSet: new Set([
              nodeId,
              ...getDescendantIds(currentNodes, nodeId),
            ]),
          };
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
        !node.readOnly &&
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
      nodeId,
      depth,
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
        monitor.getItemType() === 'card' && monitor.isOver({ shallow: true });
      const isShallowOver = monitor.isOver({ shallow: true });
      const isBatchDisabledTarget =
        isCardOver &&
        Boolean(item?.ids?.length) &&
        isDisabledBatchDropTarget(nodes, item, nodeId);
      return {
        isOver: isShallowOver && monitor.canDrop(),
        isDisabledOver:
          isBatchDisabledTarget ||
          (isCardOver && item !== null && !canDropItem(item)),
      };
    },
    hover: (item, monitor) => {
      if (!dropRef.current) {
        return;
      }
      if (!canDropItem(item)) {
        useSidebarStore.getState().setManualDropIndicator(null);
        return;
      }
      if (item.id === nodeId) {
        resetDropState();
        return;
      }
      if (item.id && monitor.isOver({ shallow: true })) {
        updateDropPosition(
          item,
          monitor.getClientOffset(),
          monitor.getDifferenceFromInitialOffset()?.x ?? 0
        );
      }
      handleHover(item, monitor);
    },
    drop: (item, monitor) => {
      if (!canDropItem(item)) {
        return;
      }
      if (item.id === nodeId) {
        resetDropState();
        return;
      }
      const dropState = getDropState();
      if (item.id && dropState) {
        const store = useSidebarStore.getState();
        if (
          dropState.target.position === 'inside' &&
          dropState.isDirectInside &&
          store.resourceSorts[node.spaceType].sort_by !== 'manual'
        ) {
          resetDropState();
          handleDrop(item, monitor);
          return;
        }
        const pendingDrop = {
          dragId: item.id,
          targetId: dropState.target.targetId,
          position: dropState.target.position,
        };
        if (store.resourceSorts[node.spaceType].sort_by === 'manual') {
          store
            .applyManualDrop(pendingDrop, () => {
              toast.error(t('sidebar.sort.sync_failed'), {
                position: 'bottom-right',
              });
            })
            .catch(() => {
              // request.ts handles backend error toasts.
            });
        } else {
          store.setPendingManualDrop(pendingDrop);
        }
        resetDropState();
        return;
      }
      if (item.id) {
        return;
      }
      handleDrop(item, monitor);
    },
  });

  const isBatchDisabledOver =
    batchDragging && isDisabledOver && disabledBatchTargetIds.includes(nodeId);

  useEffect(() => {
    drag(dragRef);
    drop(dropRef);
    // Reconnecting the drag source clears its preview, so attach this last.
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [drag, drop, preview]);

  useEffect(() => {
    if (!isOver && isFileDragOver) {
      clearFileDragTarget();
    }
    if (!isOver) {
      resetDropState();
    }
  }, [isOver, isFileDragOver, clearFileDragTarget, resetDropState]);

  return {
    dragRef,
    dropRef,
    dragStyle,
    isOver,
    isDisabledOver: isDisabledOver || isBatchDisabledOver,
    isFileDragOver,
    isInsideDrop,
  };
}
