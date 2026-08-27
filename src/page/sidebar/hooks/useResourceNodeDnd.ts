import { type RefObject, useCallback, useEffect, useMemo, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { getEmptyImage, NativeTypes } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { isSmartFolderChildResource } from '@/page/sidebar/components/smart-folder';
import {
  getManualDropLine,
  getProjectedDropDepth,
  type ManualDropTarget,
  resolveBoundaryDropTarget,
  type VisibleDropItem,
} from '@/page/sidebar/manualDropIndicator';

import { useSidebarStore } from '../store';
import type { ManualDropPosition, TreeNode } from '../store/types';
import {
  calculateSelectedCount,
  getDescendantIds,
  getTopLevelSelectedIds,
  isDescendant,
  isManagedChildrenNode,
} from '../store/utils';
import {
  DndItem,
  isDisabledBatchDropTarget,
  useDndHandlers,
} from './useDndHandlers';

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

const visibleDropItemsCache = new WeakMap<
  DndItem,
  Map<TreeNode['spaceType'], VisibleDropItem[]>
>();

function getVisibleDropItems(
  item: DndItem,
  nodes: Record<string, TreeNode>,
  spaceType: TreeNode['spaceType'],
  targetId: string
) {
  let itemsBySpace = visibleDropItemsCache.get(item);
  const cachedItems = itemsBySpace?.get(spaceType);
  if (cachedItems?.some(visibleItem => visibleItem.id === targetId)) {
    return cachedItems;
  }

  const visibleItems = Array.from(
    document.querySelectorAll<HTMLElement>('[data-resource-drop-id]')
  )
    .filter(visibleElement => {
      const visibleId = visibleElement.dataset.resourceDropId ?? '';
      return (
        nodes[visibleId]?.spaceType === spaceType &&
        !item.disabledTargetIdSet?.has(visibleId)
      );
    })
    .map(visibleElement => {
      const id = visibleElement.dataset.resourceDropId ?? '';
      const treeElement = visibleElement.closest<HTMLElement>(
        '[data-resource-tree-id]'
      );
      return {
        id,
        depth: Number(treeElement?.dataset.resourceDepth ?? 0),
      } satisfies VisibleDropItem;
    })
    .filter(visibleItem => visibleItem.id);

  if (!itemsBySpace) {
    itemsBySpace = new Map();
    visibleDropItemsCache.set(item, itemsBySpace);
  }
  itemsBySpace.set(spaceType, visibleItems);
  return visibleItems;
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
  const dropRef = useRef<HTMLDivElement>(null);
  const dropTargetRef = useRef<ManualDropTarget | null>(null);
  const targetRectRef = useRef<DOMRect | null>(null);
  const targetRectScrollTopRef = useRef<number | null>(null);
  const dropProjectionKeyRef = useRef<string | null>(null);
  const lineRef = useRef<ReturnType<typeof getManualDropLine> | null>(null);
  const isInsideDrop = useSidebarStore(
    state =>
      state.manualDropIndicator?.targetId === nodeId &&
      state.manualDropIndicator.position === 'inside' &&
      state.manualDropIndicator.line === null
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
  const setCurrentDropTarget = useCallback(
    (target: ManualDropTarget | null) => {
      dropTargetRef.current = target;
      const store = useSidebarStore.getState();
      if (target) {
        const currentIndicator = store.manualDropIndicator;
        const nextLine = lineRef.current;
        if (
          currentIndicator?.targetId === nodeId &&
          currentIndicator.position === target.position &&
          currentIndicator.line?.left === nextLine?.left &&
          currentIndicator.line?.top === nextLine?.top &&
          currentIndicator.line?.width === nextLine?.width &&
          currentIndicator.line?.arrowOffset === nextLine?.arrowOffset &&
          currentIndicator.line?.guideOffset === nextLine?.guideOffset
        ) {
          return;
        }
        store.setManualDropIndicator({
          targetId: nodeId,
          position: target.position,
          line: nextLine,
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

  const updateDropPosition = (
    item: DndItem,
    clientOffset: { x: number; y: number } | null,
    horizontalOffset: number
  ) => {
    const element = dropRef.current;
    const dragNode = item.id ? nodes[item.id] : undefined;
    const targetNode = nodes[nodeId];
    if (!element || !clientOffset || !dragNode || !targetNode) {
      dropProjectionKeyRef.current = null;
      setCurrentDropTarget(null);
      return;
    }

    const scrollTop =
      element.closest<HTMLElement>('[data-sidebar="content"]')?.scrollTop ?? 0;
    let rect = targetRectRef.current;
    if (!rect || targetRectScrollTopRef.current !== scrollTop) {
      rect = element.getBoundingClientRect();
      targetRectRef.current = rect;
      targetRectScrollTopRef.current = scrollTop;
    }
    const ratio = (clientOffset.y - rect.top) / rect.height;
    const canContain =
      !isManagedChildrenNode(targetNode) &&
      dragNode.resourceType !== 'smart_folder';
    const position: ManualDropPosition =
      canContain && ratio >= 0.25 && ratio <= 0.75
        ? 'inside'
        : ratio < 0.5
          ? 'before'
          : 'after';
    const projectedDepth = getProjectedDropDepth(
      item.depth ?? depth,
      horizontalOffset
    );
    const visibleItems = getVisibleDropItems(
      item,
      nodes,
      targetNode.spaceType,
      nodeId
    );
    const dropTarget =
      position === 'inside'
        ? {
            targetId: nodeId,
            position,
            depth: depth + 1,
          }
        : resolveBoundaryDropTarget(
            visibleItems,
            nodeId,
            projectedDepth,
            position
          );
    const resolvedTargetNode = nodes[dropTarget.targetId];
    const resolvedParent =
      dropTarget.position === 'inside'
        ? resolvedTargetNode
        : resolvedTargetNode?.parentId
          ? nodes[resolvedTargetNode.parentId]
          : undefined;
    if (
      !resolvedTargetNode ||
      isManagedChildrenNode(resolvedParent) ||
      (dragNode.resourceType === 'smart_folder' &&
        dragNode.parentId !== resolvedParent?.id)
    ) {
      dropProjectionKeyRef.current = null;
      setCurrentDropTarget(null);
      return;
    }
    const permission = resolvedParent?.currentPermission || 'full_access';
    if (permission !== 'can_edit' && permission !== 'full_access') {
      dropProjectionKeyRef.current = null;
      setCurrentDropTarget(null);
      return;
    }
    if (position === 'inside') {
      const projectionKey = `${nodeId}:inside:${dropTarget.targetId}:${dropTarget.depth}`;
      if (dropProjectionKeyRef.current === projectionKey) return;
      dropProjectionKeyRef.current = projectionKey;
      lineRef.current = null;
      setCurrentDropTarget(dropTarget);
      return;
    }

    const projectionKey = `${nodeId}:${dropTarget.position}:${dropTarget.targetId}:${dropTarget.depth}:${scrollTop}`;
    if (dropProjectionKeyRef.current === projectionKey) return;
    dropProjectionKeyRef.current = projectionKey;

    const resolvedElement =
      dropTarget.targetId === nodeId
        ? element
        : document.querySelector<HTMLElement>(
            `[data-resource-drop-id="${CSS.escape(dropTarget.targetId)}"]`
          );
    if (!resolvedElement) {
      dropProjectionKeyRef.current = null;
      setCurrentDropTarget(null);
      return;
    }
    const resolvedRect = resolvedElement.getBoundingClientRect();
    const treeRect =
      resolvedElement
        .closest<HTMLElement>('[data-resource-tree-id]')
        ?.getBoundingClientRect() ?? resolvedRect;
    const siblings = resolvedTargetNode.parentId
      ? (nodes[resolvedTargetNode.parentId]?.children ?? [])
      : [];
    const nextId = siblings[siblings.indexOf(dropTarget.targetId) + 1];
    const nextRect = nextId
      ? document
          .querySelector<HTMLElement>(
            `[data-resource-drop-id="${CSS.escape(nextId)}"]`
          )
          ?.getBoundingClientRect()
      : undefined;
    lineRef.current = getManualDropLine({
      position: dropTarget.position,
      rowRect: resolvedRect,
      treeRect,
      nextRowRect: nextRect,
      depth: dropTarget.depth,
    });
    setCurrentDropTarget(dropTarget);
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
      if (!dropRef.current) return;
      if (!canDropItem(item)) return;
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
      if (!canDropItem(item)) return;
      if (item.id && dropTargetRef.current) {
        const store = useSidebarStore.getState();
        if (
          dropTargetRef.current.position === 'inside' &&
          lineRef.current === null &&
          store.resourceSorts[node.spaceType].sort_by !== 'manual'
        ) {
          targetRectRef.current = null;
          targetRectScrollTopRef.current = null;
          dropProjectionKeyRef.current = null;
          lineRef.current = null;
          setCurrentDropTarget(null);
          handleDrop(item, monitor);
          return;
        }
        const pendingDrop = {
          dragId: item.id,
          targetId: dropTargetRef.current.targetId,
          position: dropTargetRef.current.position,
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
        targetRectScrollTopRef.current = null;
        dropProjectionKeyRef.current = null;
        lineRef.current = null;
        setCurrentDropTarget(null);
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
      targetRectScrollTopRef.current = null;
      dropProjectionKeyRef.current = null;
      lineRef.current = null;
      setCurrentDropTarget(null);
    }
  }, [isOver, isFileDragOver, clearFileDragTarget, setCurrentDropTarget]);

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
