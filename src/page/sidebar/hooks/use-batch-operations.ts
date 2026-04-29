import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import useApp from '@/hooks/use-app';
import type { SpaceType } from '@/interface';

import {
  useBatchOperationEnabled,
  useSelectionState,
  useSidebarStore,
} from '../store';

interface UseBatchOperationsOptions {
  namespaceId: string;
}

export function useBatchOperations({ namespaceId }: UseBatchOperationsOptions) {
  const app = useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const selectionState = useSelectionState();
  const batchOperationEnabled = useBatchOperationEnabled();
  const selectedIdList = Object.keys(selectionState.selectedIds);
  const nodes = useSidebarStore(state => state.nodes);

  const getSelectedIds = () =>
    Object.keys(useSidebarStore.getState().selectedIds);

  const closeDeleteDialog = () => setDeleteDialogOpen(false);
  const closeMoveDialog = () => setMoveDialogOpen(false);
  const openDeleteDialog = () => setDeleteDialogOpen(true);
  const openMoveDialog = () => setMoveDialogOpen(true);
  const openCreateDialog = () => setCreateDialogOpen(true);
  const deselectAll = () => useSidebarStore.getState().deselectAll();

  const confirmDelete = async () => {
    setIsProcessing(true);
    try {
      const result = await useSidebarStore
        .getState()
        .batchRemove(getSelectedIds());
      app.fire('trash_updated');
      if (result.failed.length > 0) {
        toast.error(
          t('batch.delete_partial_error', {
            success: result.success.length,
            failed: result.failed.length,
          })
        );
      } else {
        toast.success(
          t('batch.delete_success', { count: result.success.length })
        );
      }
    } catch {
      toast.error(t('batch.delete_failed'));
    } finally {
      setIsProcessing(false);
      closeDeleteDialog();
    }
  };

  const confirmMove = async (targetId: string) => {
    setIsProcessing(true);
    try {
      const result = await useSidebarStore
        .getState()
        .batchMove(getSelectedIds(), targetId);
      if (result.failed.length > 0) {
        toast.error(
          t('batch.move_partial_error', {
            success: result.success.length,
            failed: result.failed.length,
          })
        );
      } else {
        toast.success(
          t('batch.move_success', { count: result.success.length })
        );
      }
    } catch {
      toast.error(t('batch.move_failed'));
    } finally {
      setIsProcessing(false);
      closeMoveDialog();
    }
  };

  const refreshSelected = async () => {
    const ids = getSelectedIds();
    try {
      const result = await useSidebarStore.getState().batchRefresh(ids);
      if (result.failed.length > 0) {
        toast.error(t('batch.refresh_failed'));
      } else {
        toast.success(t('batch.refresh_success', { count: ids.length }));
      }
    } catch {
      toast.error(t('batch.refresh_failed'));
    }
  };

  const confirmCreate = async (
    folderName: string,
    targetSpaceType: SpaceType
  ) => {
    setIsProcessing(true);
    try {
      const result = await useSidebarStore
        .getState()
        .batchCreate(folderName, targetSpaceType);

      if (result.failed.length > 0) {
        if (result.success.length === 0) {
          toast.error(t('batch.create_failed'));
        } else {
          toast.success(
            t('batch.create_partial_success', {
              success: result.success.length,
              fail: result.failed.length,
            })
          );
        }
      } else {
        toast.success(
          t('batch.create_success', { count: result.success.length })
        );
      }
    } catch {
      toast.error(t('batch.create_failed'));
    } finally {
      setIsProcessing(false);
    }
  };

  const addSelectedToChat = () => {
    const ids = getSelectedIds();
    useSidebarStore.getState().addToChat(ids);
    toast.success(t('batch.add_to_chat_success', { count: ids.length }));
    if (!location.pathname.includes('/chat')) {
      navigate(`/${namespaceId}/chat`);
    }
  };

  const defaultTargetSpaceType: SpaceType = selectedIdList.some(
    id => nodes[id]?.spaceType === 'private'
  )
    ? 'private'
    : 'teamspace';

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectionState.selectionMode) {
        deselectAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectionState.selectionMode]);

  return {
    batchOperationEnabled,
    selectedIds: selectedIdList,
    nodes,
    selectionMode: selectionState.selectionMode,
    isProcessing,
    defaultTargetSpaceType,
    deleteDialogOpen,
    moveDialogOpen,
    createDialogOpen,
    setCreateDialogOpen,
    openDeleteDialog,
    closeDeleteDialog,
    openMoveDialog,
    closeMoveDialog,
    openCreateDialog,
    deselectAll,
    confirmDelete,
    confirmMove,
    refreshSelected,
    confirmCreate,
    addSelectedToChat,
  };
}
