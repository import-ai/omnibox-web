import { type RefObject, useCallback, useEffect, useMemo, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { getEmptyImage, NativeTypes } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { isSmartFolderChildResource } from '@/page/sidebar/components/smart-folder';

import { useSidebarStore } from '../store';
import type { ManualDropPosition, TreeNode } from '../store/types';
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
  dropPosition: ManualDropPosition | null;
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
    onNodeDrop,
    selectionMode = false,
    isSelected = false,
    selectedIds = [],
  } = options;

  const dragRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const dropPositionRef = useRef<ManualDropPosition | null>(null);
  const targetRectRef = useRef<DOMRect | null>(null);
  const lineRef = useRef<{ left: number; top: number; width: number } | null>(
    null
  );
  const dropPosition = useSidebarStore(state =>
    state.manualDropIndicator?.targetId === nodeId
      ? state.manualDropIndicator.position
      : null
  );
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
  const setCurrentDropPosition = useCallback(
    (position: ManualDropPosition | null) => {
      if (dropPositionRef.current === position) return;
      dropPositionRef.current = position;
      const store = useSidebarStore.getState();
      if (position) {
        store.setManualDropIndicator({
          targetId: nodeId,
          position,
          line: position === 'inside' ? null : lineRef.current,
        });
      } else if (store.manualDropIndicator?.targetId === nodeId) {
        store.setManualDropIndicator(null);
      }
    },
    [nodeId]
  );

  const canDropItem = (item: DndItem) => {
    const targetNode = nodes[nodeId];
    if (isSmartFolderChildResource(targetNode)) {
      return false;
    }

    if (item.id) {
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
      if (
        targetNode?.resourceType === 'smart_folder' ||
        targetNode?.resourceType === 'rss_folder'
      ) {
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

    return (
      targetNode?.resourceType !== 'smart_folder' &&
      targetNode?.resourceType !== 'rss_folder'
    );
  };

  const updateDropPosition = (
    item: DndItem,
    clientOffset: { x: number; y: number } | null
  ) => {
    const element = dropRef.current;
    const dragNode = item.id ? nodes[item.id] : undefined;
    const targetNode = nodes[nodeId];
    if (!element || !clientOffset || !dragNode || !targetNode) {
      setCurrentDropPosition(null);
      return;
    }

    let rect = targetRectRef.current;
    if (!rect) {
      rect = element.getBoundingClientRect();
      targetRectRef.current = rect;
    }
    const ratio = (clientOffset.y - rect.top) / rect.height;
    const canContain =
      targetNode.resourceType !== 'smart_folder' &&
      targetNode.resourceType !== 'rss_folder' &&
      dragNode.resourceType !== 'smart_folder';
    const position: ManualDropPosition =
      canContain && ratio >= 0.25 && ratio <= 0.75
        ? 'inside'
        : ratio < 0.5
          ? 'before'
          : 'after';
    const parent =
      position === 'inside'
        ? targetNode
        : targetNode.parentId
          ? nodes[targetNode.parentId]
          : undefined;
    const permission = parent?.currentPermission || 'full_access';
    if (permission !== 'can_edit' && permission !== 'full_access') {
      setCurrentDropPosition(null);
      return;
    }
    if (dropPositionRef.current === position) return;

    if (position === 'inside') {
      lineRef.current = null;
    } else if (position === 'before') {
      lineRef.current = { left: rect.left, top: rect.top, width: rect.width };
    } else {
      const siblings = targetNode.parentId
        ? (nodes[targetNode.parentId]?.children ?? [])
        : [];
      const nextId = siblings[siblings.indexOf(targetNode.id) + 1];
      const nextElement = nextId
        ? document.querySelector<HTMLElement>(
            `[data-resource-drop-id="${CSS.escape(nextId)}"]`
          )
        : null;
      const nextRect = nextElement?.getBoundingClientRect();
      lineRef.current = {
        left: nextRect?.left ?? rect.left,
        top: nextRect?.top ?? rect.bottom,
        width: nextRect?.width ?? rect.width,
      };
    }
    setCurrentDropPosition(position);
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
      if (!dropRef.current) return;
      if (!canDropItem(item)) return;
      if (item.id && monitor.isOver({ shallow: true })) {
        updateDropPosition(item, monitor.getClientOffset());
      }
      handleHover(item, monitor);
    },
    drop: (item, monitor) => {
      if (!canDropItem(item)) return;
      if (item.id && dropPositionRef.current) {
        const store = useSidebarStore.getState();
        if (
          dropPositionRef.current === 'inside' &&
          store.resourceSorts[node.spaceType].sort_by !== 'manual'
        ) {
          targetRectRef.current = null;
          lineRef.current = null;
          setCurrentDropPosition(null);
          handleDrop(item, monitor);
          return;
        }
        const pendingDrop = {
          dragId: item.id,
          targetId: nodeId,
          position: dropPositionRef.current,
        };
        if (store.resourceSorts[node.spaceType].sort_by === 'manual') {
          void store
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
        targetRectRef.current = null;
        lineRef.current = null;
        setCurrentDropPosition(null);
        return;
      }
      if (item.id) return;
      handleDrop(item, monitor);
    },
  });

  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: false });
  }, [preview]);

  const isBatchDisabledOver =
    batchDragging && isDisabledOver && disabledBatchTargetIds.includes(nodeId);

  useEffect(() => {
    drag(dragRef);
    drop(dropRef);
  }, [drag, drop]);

  useEffect(() => {
    if (!isOver && isFileDragOver) {
      clearFileDragTarget();
    }
    if (!isOver) {
      targetRectRef.current = null;
      lineRef.current = null;
      setCurrentDropPosition(null);
    }
  }, [isOver, isFileDragOver, clearFileDragTarget, setCurrentDropPosition]);

  return {
    dragRef,
    dropRef,
    dragStyle,
    isOver,
    isDisabledOver: isDisabledOver || isBatchDisabledOver,
    isFileDragOver,
    dropPosition,
  };
}
