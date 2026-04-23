import { useEffect, useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import type { TreeNode } from '../store';
import { useSidebarStore } from '../store';
import { isValidFileType } from '../utils';

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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { namespaceId, onNodeDrop } = options;

  const ref = useRef<HTMLDivElement>(null);
  const [localFileDragTarget, setLocalFileDragTarget] = useState<string | null>(
    null
  );
  const isFileDragOver = localFileDragTarget === nodeId;

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
      const itemType = monitor.getItemType();
      const isOverShallow = monitor.isOver({ shallow: true });

      if (itemType === NativeTypes.FILE) {
        if (isOverShallow) setLocalFileDragTarget(nodeId);
      } else {
        setLocalFileDragTarget(null);
        if (!isOverShallow) return;
        const dragId = (item as { id: string }).id;
        if (dragId === nodeId) return;
      }
    },
    drop: (item, monitor) => {
      const itemType = monitor.getItemType();
      if (itemType === NativeTypes.FILE) {
        if (monitor.didDrop()) return;
        const fileItem = item as { files: File[] };
        const validFiles = fileItem.files.filter(file =>
          isValidFileType(file.name)
        );
        if (validFiles.length > 0) {
          const fileList = new DataTransfer();
          validFiles.forEach(file => fileList.items.add(file));
          useSidebarStore
            .getState()
            .uploadFiles(nodeId, fileList.files)
            .then(id => {
              useSidebarStore.getState().activate(id);
              navigate(`/${namespaceId}/${id}`, {
                state: { fromSidebar: true },
              });
              toast.success(
                t('upload.success', { count: fileList.files.length })
              );
            })
            .catch(err => {
              toast.error(err?.message || t('upload.failed'));
            });
        } else {
          toast(t('upload.invalid_ext'), { position: 'bottom-right' });
        }
        setLocalFileDragTarget(null);
      } else {
        const dragItem = item as { id: string };
        if (dragItem.id !== nodeId) {
          if (onNodeDrop) {
            onNodeDrop(dragItem.id, nodeId);
          } else {
            useSidebarStore
              .getState()
              .move(dragItem.id, nodeId)
              .catch(() => {
                toast.error(t('move.failed'));
              });
          }
        }
      }
    },
  });

  useEffect(() => {
    drag(ref);
    drop(ref);
  }, [drag, drop]);

  useEffect(() => {
    if (!isOver && isFileDragOver) {
      setLocalFileDragTarget(null);
    }
  }, [isOver, isFileDragOver]);

  return { ref, dragStyle, isOver, isFileDragOver };
}
