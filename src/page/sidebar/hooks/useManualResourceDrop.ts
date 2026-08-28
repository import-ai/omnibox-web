import { type RefObject, useCallback, useRef } from 'react';

import {
  getManualDropLine,
  getProjectedDropDepth,
  type ManualDropTarget,
  resolveBoundaryDropTarget,
  type VisibleDropItem,
} from '@/page/sidebar/manualDropIndicator';
import { useSidebarStore } from '@/page/sidebar/store';
import type { ManualDropPosition, TreeNode } from '@/page/sidebar/store/types';
import { isManagedChildrenNode } from '@/page/sidebar/store/utils';

import type { DndItem } from './useDndHandlers';

interface UseManualResourceDropOptions {
  depth: number;
  nodeId: string;
  nodes: Readonly<Record<string, TreeNode>>;
}

interface ManualDropState {
  isDirectInside: boolean;
  target: ManualDropTarget;
}

interface UseManualResourceDropResult {
  dropRef: RefObject<HTMLDivElement | null>;
  isInsideDrop: boolean;
  updateDropPosition: (
    item: DndItem,
    clientOffset: { x: number; y: number } | null,
    horizontalOffset: number
  ) => void;
  getDropState: () => ManualDropState | null;
  resetDropState: () => void;
}

const visibleDropItemsCache = new WeakMap<
  DndItem,
  Map<TreeNode['spaceType'], VisibleDropItem[]>
>();

function getVisibleDropItems(
  item: DndItem,
  nodes: Readonly<Record<string, TreeNode>>,
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

export function useManualResourceDrop({
  depth,
  nodeId,
  nodes,
}: UseManualResourceDropOptions): UseManualResourceDropResult {
  const dropRef = useRef<HTMLDivElement>(null);
  const dropTargetRef = useRef<ManualDropTarget | null>(null);
  const dropProjectionKeyRef = useRef<string | null>(null);
  const lineRef = useRef<ReturnType<typeof getManualDropLine> | null>(null);
  const isInsideDrop = useSidebarStore(
    state =>
      state.manualDropIndicator?.targetId === nodeId &&
      state.manualDropIndicator.position === 'inside' &&
      state.manualDropIndicator.line === null
  );

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

  const resetDropState = useCallback(() => {
    dropProjectionKeyRef.current = null;
    lineRef.current = null;
    setCurrentDropTarget(null);
  }, [setCurrentDropTarget]);

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

    // Auto-scroll and tree expansion can move a row while it remains hovered.
    // Pointer coordinates are viewport-relative, so the row rect must be fresh too.
    const rect = element.getBoundingClientRect();
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
    // Reordering inside a managed folder (rss items) is not allowed.
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
      if (
        dropProjectionKeyRef.current === projectionKey &&
        useSidebarStore.getState().manualDropIndicator?.targetId === nodeId
      ) {
        return;
      }
      dropProjectionKeyRef.current = projectionKey;
      lineRef.current = null;
      setCurrentDropTarget(dropTarget);
      return;
    }

    dropProjectionKeyRef.current = null;

    lineRef.current = getManualDropLine({
      position,
      rowRect: rect,
      depth: dropTarget.depth,
    });
    setCurrentDropTarget(dropTarget);
  };

  const getDropState = (): ManualDropState | null => {
    const target = dropTargetRef.current;
    if (!target) {
      return null;
    }
    return { target, isDirectInside: lineRef.current === null };
  };

  return {
    dropRef,
    isInsideDrop,
    updateDropPosition,
    getDropState,
    resetDropState,
  };
}
