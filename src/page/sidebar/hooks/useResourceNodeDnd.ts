import {
  type RefObject,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { getEmptyImage, NativeTypes } from 'react-dnd-html5-backend';

import type { TreeNode } from '../store';
import { useSidebarStore } from '../store';
import {
  calculateSelectedCount,
  getTopLevelSelectedIds,
  isDescendant,
} from '../store/utils';
import { DndItem, useDndHandlers } from './useDndHandlers';

interface UseResourceNodeDndOptions {
  namespaceId: string;
  onNodeDrop?: (dragId: string, dropId: string) => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  selectedIds?: string[];
}

interface UseResourceNodeDndReturn {
  ref: RefObject<HTMLDivElement | null>;
  dragStyle: { opacity: number };
  isOver: boolean;
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

  const ref = useRef<HTMLDivElement>(null);
  const nodes = useSidebarStore(state => state.nodes);
  const selectedMap = useSidebarStore(state => state.selectedIds);
  const batchIds = useMemo(
    () => getTopLevelSelectedIds(nodes, selectedIds),
    [nodes, selectedIds]
  );
  const batchCount = useMemo(
    () => calculateSelectedCount(nodes, selectedMap),
    [nodes, selectedMap]
  );
  const canDropItem = (item: DndItem) => {
    if (item.id) {
      return item.id !== nodeId && !isDescendant(nodes, item.id, nodeId);
    }
    if (item.ids?.length) {
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
          count: batchCount,
          preview: node,
        };
      },
      canDrag: () => !isEditing && (!selectionMode || isSelected),
      collect: monitor => ({
        opacity: monitor.isDragging() ? 0.5 : 1,
      }),
    },
    [batchCount, batchIds, isEditing, isSelected, node, selectionMode]
  );

  const [{ isOver }, drop] = useDrop<DndItem, void, { isOver: boolean }>({
    accept: ['card', NativeTypes.FILE],
    canDrop: item => canDropItem(item),
    collect: monitor => ({
      isOver: monitor.isOver({ shallow: true }) && monitor.canDrop(),
    }),
    hover: (item, monitor) => {
      if (!ref.current) return;
      if (!canDropItem(item)) return;
      handleHover(item, monitor);
    },
    drop: (item, monitor) => {
      if (!canDropItem(item)) return;
      handleDrop(item, monitor);
    },
  });

  useLayoutEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: false });
  }, [preview]);

  useEffect(() => {
    drag(ref);
    drop(ref);
  }, [drag, drop]);

  useEffect(() => {
    if (!isOver && isFileDragOver) {
      clearFileDragTarget();
    }
  }, [isOver, isFileDragOver, clearFileDragTarget]);

  return { ref, dragStyle, isOver, isFileDragOver };
}
