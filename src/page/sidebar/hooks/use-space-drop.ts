import { type RefObject, useEffect, useRef } from 'react';
import { useDrop } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';

import { DndItem, useDndHandlers } from './use-dnd-handlers';

interface UseSpaceDropOptions {
  spaceId: string;
  namespaceId: string;
}

interface UseSpaceDropReturn {
  ref: RefObject<HTMLDivElement | null>;
  isOver: boolean;
  canDrop: boolean;
  isFileDragOver: boolean;
}

export function useSpaceDrop({
  spaceId,
  namespaceId,
}: UseSpaceDropOptions): UseSpaceDropReturn {
  const ref = useRef<HTMLDivElement>(null);

  const { handleDrop, handleHover, isFileDragOver, clearFileDragTarget } =
    useDndHandlers({
      targetId: spaceId,
      namespaceId,
    });

  const [{ canDrop, isOver }, drop] = useDrop<
    DndItem,
    void,
    { isOver: boolean; canDrop: boolean }
  >({
    accept: [NativeTypes.FILE, 'card'],
    drop: (item, monitor) => {
      handleDrop(item, monitor);
    },
    collect: monitor => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
    hover: (item, monitor) => {
      handleHover(item, monitor);
    },
  });

  useEffect(() => {
    if (ref.current) {
      drop(ref);
    }
  }, [drop]);

  useEffect(() => {
    if (!isOver && isFileDragOver) {
      clearFileDragTarget();
    }
  }, [isOver, isFileDragOver, clearFileDragTarget]);

  return { ref, isOver, canDrop, isFileDragOver };
}
