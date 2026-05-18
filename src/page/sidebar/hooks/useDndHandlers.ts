import { useState } from 'react';
import { NativeTypes } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import type { TreeNode } from '../store';
import { useSidebarStore } from '../store';
import { getTopLevelSelectedIds, isDescendant } from '../store/utils';
import { isValidFileType } from '../utils';

interface UseDndHandlersOptions {
  targetId: string;
  namespaceId: string;
  onNodeDrop?: (dragId: string, targetId: string) => void;
}

interface UseDndHandlersReturn {
  handleDrop: (
    item: DndItem,
    monitor: { didDrop: () => boolean; getItemType: () => unknown }
  ) => void;
  handleHover: (
    item: DndItem,
    monitor: {
      getItemType: () => unknown;
      isOver: (options?: { shallow: boolean }) => boolean;
    }
  ) => void;
  isFileDragOver: boolean;
  clearFileDragTarget: () => void;
}

export interface DndItem {
  files?: File[];
  id?: string;
  ids?: string[];
  count?: number;
  preview?: TreeNode;
}

export function useDndHandlers({
  targetId,
  namespaceId,
  onNodeDrop,
}: UseDndHandlersOptions): UseDndHandlersReturn {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [fileDragTarget, setFileDragTarget] = useState<string | null>(null);
  const isFileDragOver = fileDragTarget === targetId;

  const handleFileUpload = (files: File[]) => {
    const validFiles = files.filter(file => isValidFileType(file.name));

    if (validFiles.length === 0) {
      toast(t('upload.invalid_ext'), { position: 'bottom-right' });
      return;
    }

    const fileList = new DataTransfer();
    validFiles.forEach(file => fileList.items.add(file));

    return useSidebarStore
      .getState()
      .uploadFiles(targetId, fileList.files)
      .then(id => {
        useSidebarStore.getState().activate(id);
        navigate(`/${namespaceId}/${id}`, { state: { fromSidebar: true } });
        toast.success(t('upload.success', { count: fileList.files.length }), {
          position: 'bottom-right',
        });
        return id;
      })
      .catch(err => {
        const message =
          err instanceof Error ? err.message : err || t('upload.failed');
        toast(message, { position: 'bottom-right' });
      });
  };

  const handleNodeMove = (dragId: string) => {
    if (dragId === targetId) return;
    if (useSidebarStore.getState().nodes[dragId]?.parentId === targetId) return;

    if (onNodeDrop) {
      onNodeDrop(dragId, targetId);
    } else {
      return useSidebarStore
        .getState()
        .move(dragId, targetId)
        .catch(() => {
          // request.ts handles backend error toasts.
        });
    }
  };

  const handleBatchMove = (ids: string[], count: number) => {
    const store = useSidebarStore.getState();
    const topLevelIds = getTopLevelSelectedIds(store.nodes, ids);
    if (
      topLevelIds.some(
        id => id === targetId || isDescendant(store.nodes, id, targetId)
      )
    ) {
      return;
    }
    if (topLevelIds.every(id => store.nodes[id]?.parentId === targetId)) {
      return;
    }

    return store
      .batchMove(topLevelIds, targetId)
      .then(result => {
        if (result.failed.length > 0) {
          if (result.success.length === 0) {
            toast.error(t('batch.all_forbidden'), { position: 'bottom-right' });
          } else {
            toast.success(
              t('batch.move_partial_error', {
                success: result.success.length,
                failed: result.failed.length,
              }),
              { position: 'bottom-right' }
            );
          }
        } else {
          toast.success(t('batch.move_success', { count }), {
            position: 'bottom-right',
          });
        }
      })
      .catch(() => {
        toast.error(t('batch.move_failed'), { position: 'bottom-right' });
      });
  };

  const handleDrop = (
    item: DndItem,
    monitor: { didDrop: () => boolean; getItemType: () => unknown }
  ) => {
    if (monitor.didDrop()) return;
    const itemType = monitor.getItemType();

    if (item.ids?.includes(targetId)) {
      setFileDragTarget(null);
      return;
    }

    if (itemType === NativeTypes.FILE && item.files) {
      handleFileUpload(item.files);
    } else if (item.ids) {
      handleBatchMove(item.ids, item.count ?? item.ids.length);
    } else if (item.id) {
      handleNodeMove(item.id);
    }

    setFileDragTarget(null);
  };

  const handleHover = (
    item: DndItem,
    monitor: {
      getItemType: () => unknown;
      isOver: (options?: { shallow: boolean }) => boolean;
    }
  ) => {
    const isOverShallow = monitor.isOver({ shallow: true });
    const itemType = monitor.getItemType();

    if (itemType === NativeTypes.FILE) {
      if (isOverShallow) setFileDragTarget(targetId);
    } else if (itemType === 'card') {
      setFileDragTarget(null);
      if (!isOverShallow) return;
      if (item.ids?.includes(targetId)) return;
      if (item.id === targetId) return;
    }
  };

  const clearFileDragTarget = () => {
    setFileDragTarget(null);
  };

  return {
    handleDrop,
    handleHover,
    isFileDragOver,
    clearFileDragTarget,
  };
}
