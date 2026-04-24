import { useEffect, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';

import type { TreeNode } from '../store';
import { useDndHandlers } from './use-dnd-handlers';

interface UseResourceNodeDndOptions {
  namespaceId: string;
  onNodeDrop?: (dragId: string, dropId: string) => void;
}

interface UseResourceNodeDndReturn {
  ref: React.RefObject<HTMLDivElement>;
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
  const { namespaceId, onNodeDrop } = options;

  const ref = useRef<HTMLDivElement>(null);

  const { handleDrop, handleHover, isFileDragOver, clearFileDragTarget } =
    useDndHandlers({
      targetId: nodeId,
      namespaceId,
      onNodeDrop,
    });

  const [dragStyle, drag] = useDrag(
    {
      type: 'card',
      item: () => node,
      canDrag: () => !isEditing,
      collect: monitor => ({
        opacity: monitor.isDragging() ? 0.5 : 1,
      }),
    },
    [isEditing, node]
  );

  const [{ isOver }, drop] = useDrop({
    accept: ['card', NativeTypes.FILE],
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
