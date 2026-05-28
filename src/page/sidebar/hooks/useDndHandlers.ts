import { useState } from 'react';
import { NativeTypes } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { isSmartFolderChildResource } from '@/page/sidebar/components/smart-folder';

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
  resourceType?: string;
  attrs?: Record<string, unknown>;
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
    const targetNode = useSidebarStore.getState().nodes[targetId];
    if (
      targetNode?.resourceType === 'smart_folder' ||
      isSmartFolderChildResource(targetNode)
    ) {
      return;
    }

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
      .catch(err => {
        const message =
          err instanceof Error ? err.message : err || t('upload.failed');
        toast(message, { position: 'bottom-right' });
      });
  };

  const handleNodeMove = (dragId: string) => {
    if (dragId === targetId) return;

    const nodes = useSidebarStore.getState().nodes;
    const dragNode = nodes[dragId];
    const targetNode = nodes[targetId];
    if (
      isSmartFolderChildResource(dragNode) ||
      isSmartFolderChildResource(targetNode)
    ) {
      return;
    }
    if (
      dragNode?.resourceType &&
      targetNode?.resourceType &&
      (dragNode.resourceType === 'smart_folder') !==
        (targetNode.resourceType === 'smart_folder')
    ) {
      return;
    }

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

  const handleDrop = (
    item: DndItem,
    monitor: { didDrop: () => boolean; getItemType: () => unknown }
  ) => {
    if (monitor.didDrop()) return;
    const itemType = monitor.getItemType();

    if (itemType === NativeTypes.FILE && item.files) {
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

    if (itemType === NativeTypes.FILE) {
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
