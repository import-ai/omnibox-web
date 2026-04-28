import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useSidebarStore } from '../store';
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
        toast.success(t('upload.success', { count: fileList.files.length }));
        return id;
      })
      .catch(() => {
        toast.error(t('upload.failed'));
        throw new Error('Upload failed');
      });
  };

  const handleNodeMove = (dragId: string) => {
    if (dragId === targetId) return;

    if (onNodeDrop) {
      onNodeDrop(dragId, targetId);
    } else {
      return useSidebarStore
        .getState()
        .move(dragId, targetId)
        .catch(() => {
          //
        });
    }
  };

  const handleDrop = (
    item: DndItem,
    monitor: { didDrop: () => boolean; getItemType: () => unknown }
  ) => {
    if (monitor.didDrop()) return;
    const itemType = monitor.getItemType();

    if (itemType === 'FILE' && item.files) {
      handleFileUpload(item.files);
    } else if (itemType === 'card' && item.id) {
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

    if (itemType === 'FILE') {
      if (isOverShallow) setFileDragTarget(targetId);
    } else if (itemType === 'card') {
      setFileDragTarget(null);
      if (!isOverShallow) return;
      if (item.id && item.id === targetId) return;
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
