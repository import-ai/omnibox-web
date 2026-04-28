import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useSidebar } from '@/components/ui/sidebar';
import useApp from '@/hooks/use-app';
import { useIsMobile } from '@/hooks/use-mobile';
import { addToChatContext } from '@/lib/chat-bridge';
import { deleteResource } from '@/lib/delete-resource';
import { useNode, useSidebarStore } from '@/page/sidebar/store';
import { triggerGlobalFileUpload } from '@/page/sidebar/utils';

export interface UseNodeActionsReturn {
  node: ReturnType<typeof useNode>;

  moveTo: boolean;
  setMoveTo: (v: boolean) => void;

  handleCreateFile: () => void;
  /** Creates a folder directly without a name dialog (context-menu path) */
  handleCreateFolderDirect: () => void;
  /** Opens the create-folder dialog (dropdown-menu path) */
  handleCreateFolderWithDialog: () => void;
  handleEdit: () => void;
  handleUpload: () => void;
  handleDelete: () => void;
  handleMoveTo: () => void;
  handleMoveFinished: (resourceId: string, targetId: string) => void;
  handleAddToChat: () => void;
  handleAddAllToChat: () => void;
}

export function useNodeActions(
  nodeId: string,
  namespaceId: string
): UseNodeActionsReturn {
  const app = useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { setOpenMobile } = useSidebar();
  const node = useNode(nodeId);

  const [moveTo, setMoveTo] = useState(false);

  const handleCreateFile = () => {
    useSidebarStore
      .getState()
      .create(nodeId, 'doc')
      .then(id => {
        useSidebarStore.getState().activate(id);
        navigate(`/${namespaceId}/${id}/edit`, {
          state: { fromSidebar: true },
        });
        if (isMobile) setOpenMobile(false);
      })
      .catch(err => {
        toast.error(err?.message || t('create.failed'));
      });
  };

  const handleCreateFolderDirect = () => {
    useSidebarStore
      .getState()
      .create(nodeId, 'folder')
      .then(() => {
        if (isMobile) setOpenMobile(false);
      })
      .catch(err => {
        toast.error(err?.message || t('create.failed'));
      });
  };

  const handleCreateFolderWithDialog = () => {
    useSidebarStore.getState().openCreateFolderDialog(nodeId);
  };

  const handleEdit = () => {
    navigate(`/${namespaceId}/${nodeId}/edit`);
    if (isMobile) setOpenMobile(false);
  };

  const loc = useLocation();
  const addToContext = (type: 'resource' | 'folder') => {
    const doAdd = () => addToChatContext(node!, type as 'resource' | 'folder');
    if (loc.pathname.includes('/chat')) {
      doAdd();
    } else {
      navigate(`/${namespaceId}/chat`);
      setTimeout(doAdd, 100);
    }
  };

  const handleAddToChat = () => addToContext('resource');
  const handleAddAllToChat = () => addToContext('folder');

  const handleMoveTo = () => {
    setMoveTo(true);
  };

  const handleDelete = () => {
    deleteResource({
      id: nodeId,
      parentId: node?.parentId ?? null,
      namespaceId,
      app,
    });
  };

  const handleUpload = () => {
    triggerGlobalFileUpload(nodeId);
  };

  const handleMoveFinished = async (resourceId: string, targetId: string) => {
    setMoveTo(false);
    await useSidebarStore.getState().move(resourceId, targetId);
  };

  return {
    node,
    moveTo,
    setMoveTo,
    handleCreateFile,
    handleCreateFolderDirect,
    handleCreateFolderWithDialog,
    handleEdit,
    handleUpload,
    handleDelete,
    handleMoveTo,
    handleMoveFinished,
    handleAddToChat,
    handleAddAllToChat,
  };
}
