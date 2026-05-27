import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import useApp from '@/hooks/use-app';

import { useSelectedCount, useSelectionState, useSidebarStore } from '../store';

interface UseBatchOperationsOptions {
  namespaceId: string;
}

const OPEN_LAYER_SELECTOR = [
  '[role="dialog"][data-state="open"]',
  '[role="alertdialog"][data-state="open"]',
  '[data-radix-popper-content-wrapper] [data-state="open"]',
].join(',');

function hasOpenFloatingLayer() {
  return document.querySelector(OPEN_LAYER_SELECTOR) !== null;
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

export function useBatchOperations({ namespaceId }: UseBatchOperationsOptions) {
  const app = useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const selectionMode = useSidebarStore(state => state.selectionMode);
  const batchDragging = useSidebarStore(state => state.batchDragging);
  const deleteDialogOpen = useSidebarStore(state => state.dialogs.batchDelete);
  const moveDialogOpen = useSidebarStore(state => state.dialogs.batchMove);
  const createDialogOpen = useSidebarStore(state => state.dialogs.batchCreate);
  const [isProcessing, setIsProcessing] = useState(false);
  const selectionState = useSelectionState();
  const selectedCount = useSelectedCount();
  const selectedIdList = Object.keys(selectionState.selectedIds);
  const nodes = useSidebarStore(state => state.nodes);
  const toggleSelectionMode = () => {
    useSidebarStore.getState().setSelectionMode(!selectionMode);
  };
  const getSelectedIds = () =>
    Object.keys(useSidebarStore.getState().selectedIds);

  const closeDeleteDialog = () =>
    useSidebarStore.getState().setBatchDeleteDialog(false);
  const closeMoveDialog = () =>
    useSidebarStore.getState().setBatchMoveDialog(false);
  const closeCreateDialog = () =>
    useSidebarStore.getState().setBatchCreateDialog(false);
  const openDeleteDialog = () =>
    useSidebarStore.getState().setBatchDeleteDialog(true);
  const openMoveDialog = () =>
    useSidebarStore.getState().setBatchMoveDialog(true);
  const openCreateDialog = () =>
    useSidebarStore.getState().setBatchCreateDialog(true);
  const deselectAll = () => useSidebarStore.getState().deselectAll();
  const confirmDelete = async () => {
    setIsProcessing(true);
    try {
      const result = await useSidebarStore
        .getState()
        .batchRemove(getSelectedIds());
      app.fire('trash_updated');
      if (result.failed.length > 0) {
        if (result.success.length === 0) {
          toast.error(t('batch.all_forbidden'), { position: 'bottom-right' });
        } else {
          toast.success(
            t('batch.delete_partial_error', {
              success: result.success.length,
              failed: result.failed.length,
            }),
            { position: 'bottom-right' }
          );
        }
      } else {
        toast.success(
          t('batch.delete_success', { count: result.success.length }),
          { position: 'bottom-right' }
        );
      }
    } catch {
      toast.error(t('batch.delete_failed'), { position: 'bottom-right' });
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
        toast.success(
          t('batch.move_success', { count: result.success.length }),
          { position: 'bottom-right' }
        );
      }
      if (result.success.length > 0) {
        useSidebarStore.getState().activate(targetId);
        navigate(`/${namespaceId}/${targetId}`, {
          state: { fromSidebar: true },
        });
        app.fire('scroll_to_resource', targetId);
      }
    } catch (error) {
      toast.error(t(getBatchMoveErrorKey(error)), {
        position: 'bottom-right',
      });
    } finally {
      setIsProcessing(false);
      closeMoveDialog();
    }
  };
  const confirmCreate = async (folderName: string, parentId: string) => {
    setIsProcessing(true);
    try {
      const result = await useSidebarStore
        .getState()
        .batchCreate(folderName, parentId);

      if (result.failed.length > 0) {
        if (result.success.length === 0) {
          toast.error(t('batch.all_forbidden'), { position: 'bottom-right' });
          return false;
        } else {
          toast.success(
            t('batch.create_partial_success', {
              success: result.success.length,
              fail: result.failed.length,
            }),
            { position: 'bottom-right' }
          );
        }
      } else {
        toast.success(
          t('batch.create_success', { count: result.success.length }),
          { position: 'bottom-right' }
        );
      }

      if (result.resourceId) {
        useSidebarStore.getState().activate(result.resourceId);
        navigate(`/${namespaceId}/${result.resourceId}`, {
          state: { fromSidebar: true },
        });
        app.fire('scroll_to_resource', result.resourceId);
      }
      return true;
    } catch (error: any) {
      if (error?.response?.data?.code === 'resource_name_conflict') {
        toast.error(t('batch.create_name_conflict'), {
          position: 'bottom-right',
        });
        return false;
      }
      if (isTargetNotEditableError(error)) {
        toast.error(
          t('batch.create_target_readonly', {
            target:
              error?.response?.data?.target_name ||
              nodes[parentId]?.name ||
              t('batch.create_target_label'),
          }),
          { position: 'bottom-right' }
        );
        return false;
      }
      toast.error(t('batch.create_failed'), { position: 'bottom-right' });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const addSelectedToChat = () => {
    const ids = getSelectedIds();
    const addedIds = useSidebarStore.getState().addToChat(ids);
    toast.success(t('batch.add_to_chat_success', { count: addedIds.length }), {
      position: 'bottom-right',
    });
    if (!location.pathname.includes('/chat')) {
      navigate(`/${namespaceId}/chat`);
    }
  };

  const defaultTargetSpaceType = selectedIdList.some(
    id => nodes[id]?.spaceType === 'private'
  )
    ? 'private'
    : 'teamspace';
  const defaultTargetId =
    useSidebarStore.getState().rootIds[defaultTargetSpaceType];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (batchDragging) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (hasOpenFloatingLayer()) {
        return;
      }

      if (selectionMode) {
        deselectAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [batchDragging, selectionMode]);

  return {
    selectedIds: selectedIdList,
    selectedCount,
    nodes,
    isProcessing,
    selectionMode,
    toggleSelectionMode,
    defaultTargetSpaceType,
    defaultTargetId,
    deleteDialogOpen,
    moveDialogOpen,
    createDialogOpen,
    openDeleteDialog,
    closeDeleteDialog,
    openMoveDialog,
    closeMoveDialog,
    openCreateDialog,
    closeCreateDialog,
    deselectAll,
    confirmDelete,
    confirmMove,
    confirmCreate,
    addSelectedToChat,
  };
}
