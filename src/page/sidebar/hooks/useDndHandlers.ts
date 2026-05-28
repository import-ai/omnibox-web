import { useState } from 'react';
import { NativeTypes } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import useApp from '@/hooks/useApp';
import { isSmartFolderChildResource } from '@/page/sidebar/components/smart-folder';

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
  disabledTargetIds?: string[];
  count?: number;
  preview?: TreeNode;
  resourceType?: string;
  attrs?: Record<string, unknown>;
}

export function isBatchDropOnDraggedResource(
  nodes: Record<string, TreeNode>,
  ids: string[],
  targetId: string
) {
  const topLevelIds = getTopLevelSelectedIds(nodes, ids);
  return topLevelIds.some(
    id => id === targetId || isDescendant(nodes, id, targetId)
  );
}

export function isDisabledBatchDropTarget(
  nodes: Record<string, TreeNode>,
  item: Pick<DndItem, 'ids' | 'disabledTargetIds'>,
  targetId: string
) {
  if (item.disabledTargetIds?.includes(targetId)) {
    return true;
  }
  if (!item.ids?.length) {
    return false;
  }
  return isBatchDropOnDraggedResource(nodes, item.ids, targetId);
}

function isTargetNotEditableError(error: unknown) {
  return (error as any)?.response?.data?.code === 'target_not_editable';
}

function isBatchSourceNotEditableError(error: unknown) {
  return (error as any)?.response?.data?.code === 'batch_source_not_editable';
}

function getBatchMoveErrorKey(error: unknown) {
  if (isBatchSourceNotEditableError(error)) {
    return 'batch.all_forbidden';
  }
  if (isTargetNotEditableError(error)) {
    return 'batch.move_target_readonly';
  }
  return 'batch.move_failed';
}

export function useDndHandlers({
  targetId,
  namespaceId,
  onNodeDrop,
}: UseDndHandlersOptions): UseDndHandlersReturn {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const app = useApp();

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

    const nodes = useSidebarStore.getState().nodes;
    const dragNode = nodes[dragId];
    const targetNode = nodes[targetId];
    if (dragNode?.parentId === targetId) return;
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
        .then(() => {
          useSidebarStore.getState().activate(targetId);
          navigate(`/${namespaceId}/${targetId}`, {
            state: { fromSidebar: true },
          });
          app.fire('scroll_to_resource', targetId);
        })
        .catch(() => {
          // request.ts handles backend error toasts.
        });
    }
  };

  const handleBatchMove = (ids: string[], count: number) => {
    const store = useSidebarStore.getState();
    const topLevelIds = getTopLevelSelectedIds(store.nodes, ids);
    if (isBatchDropOnDraggedResource(store.nodes, topLevelIds, targetId)) {
      return;
    }
    if (topLevelIds.every(id => store.nodes[id]?.parentId === targetId)) {
      return;
    }

    return store
      .batchMove(topLevelIds, targetId)
      .then(result => {
        const nameConflictCount = result.nameConflictIds?.length ?? 0;
        if (result.failed.length > 0) {
          if (result.success.length === 0) {
            toast.error(
              t(
                nameConflictCount > 0
                  ? 'batch.move_name_conflict_failed'
                  : 'batch.all_forbidden'
              ),
              { position: 'bottom-right' }
            );
          } else if (nameConflictCount > 0) {
            toast.success(
              t('batch.move_name_conflict_partial', {
                success: result.success.length,
                failed: nameConflictCount,
              }),
              { position: 'bottom-right' }
            );
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
        if (result.success.length > 0) {
          useSidebarStore.getState().activate(targetId);
          navigate(`/${namespaceId}/${targetId}`, {
            state: { fromSidebar: true },
          });
          app.fire('scroll_to_resource', targetId);
        }
      })
      .catch(error => {
        toast.error(t(getBatchMoveErrorKey(error)), {
          position: 'bottom-right',
        });
      });
  };

  const handleDrop = (
    item: DndItem,
    monitor: { didDrop: () => boolean; getItemType: () => unknown }
  ) => {
    if (monitor.didDrop()) return;
    const itemType = monitor.getItemType();
    const nodes = useSidebarStore.getState().nodes;

    if (item.ids && isDisabledBatchDropTarget(nodes, item, targetId)) {
      setFileDragTarget(null);
      return;
    }

    if (itemType === NativeTypes.FILE && item.files) {
      handleFileUpload(item.files);
    } else if (item.ids) {
      handleBatchMove(item.ids, item.count ?? item.ids.length);
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
      if (
        item.ids &&
        isDisabledBatchDropTarget(
          useSidebarStore.getState().nodes,
          item,
          targetId
        )
      ) {
        return;
      }
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
