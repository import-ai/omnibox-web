import { type RefObject, useEffect, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';

import type { TreeNode } from '../store';
import { DndItem, useDndHandlers } from './use-dnd-handlers';

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

  const { handleDrop, handleHover, isFileDragOver, clearFileDragTarget } =
    useDndHandlers({
      targetId: nodeId,
      namespaceId,
      onNodeDrop,
    });

  const [dragStyle, drag] = useDrag(
    {
      type: selectionMode && isSelected ? 'batch' : 'card',
      item: () =>
        selectionMode && isSelected
          ? { type: 'batch', ids: selectedIds, count: selectedIds.length }
          : node,
      canDrag: () => !isEditing && (!selectionMode || isSelected),
      collect: monitor => ({
        opacity: monitor.isDragging() ? 0.5 : 1,
      }),
    },
    [isEditing, isSelected, node, selectedIds, selectionMode]
  );

  const [{ isOver }, drop] = useDrop<DndItem, void, { isOver: boolean }>({
    accept: ['card', 'batch', NativeTypes.FILE],
    collect: monitor => ({
      isOver: monitor.isOver({ shallow: true }),
    }),
    hover: (item, monitor) => {
      if (!ref.current) return;
      handleHover(item, monitor);
    },
    drop: (item, monitor) => {
      handleDrop(item, monitor);
    },
  });

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
