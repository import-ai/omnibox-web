import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useSidebar } from '@/components/ui/sidebar';
import useApp from '@/hooks/use-app';
import { useIsMobile } from '@/hooks/use-mobile';
import { addToChatContext } from '@/lib/chat-bridge';
import { deleteResource } from '@/lib/delete-resource';
import { useNode } from '@/page/sidebar/store/selectors';
import { useSidebarStore } from '@/page/sidebar/store/sidebar-store';

export interface UseNodeActionsReturn {
  node: ReturnType<typeof useNode>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;

  moveTo: boolean;
  setMoveTo: (v: boolean) => void;
  createFolderOpen: boolean;
  setCreateFolderOpen: (v: boolean) => void;

  handleCreateFile: () => void;
  /** Creates a folder directly without a name dialog (context-menu path) */
  handleCreateFolderDirect: () => void;
  /** Opens the create-folder dialog (dropdown-menu path) */
  handleCreateFolderWithDialog: () => void;
  handleConfirmCreateFolder: (folderName: string) => Promise<string>;
  handleEdit: () => void;
  handleRename: () => void;
  handleUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setCreateFolderOpen(true);
  };

  const handleConfirmCreateFolder = (folderName: string) => {
    return useSidebarStore
      .getState()
      .create(nodeId, 'folder', folderName)
      .then(id => {
        if (isMobile) setOpenMobile(false);
        return id;
      })
      .catch(err => {
        toast.error(err?.message || t('create.failed'));
        throw err;
      });
  };

  const handleEdit = () => {
    navigate(`/${namespaceId}/${nodeId}/edit`, {
      state: { fromSidebar: true },
    });
    if (isMobile) setOpenMobile(false);
  };

  const handleRename = () => {
    setTimeout(() => {
      useSidebarStore.getState().setEditingId(nodeId);
    }, 150);
  };

  const addToContext = (type: 'resource' | 'folder') => {
    const doAdd = () => addToChatContext(node!, type as 'resource' | 'folder');
    if (location.pathname.includes('/chat')) {
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

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    useSidebarStore
      .getState()
      .upload(nodeId, e.target.files)
      .then(id => {
        useSidebarStore.getState().activate(id);
        navigate(`/${namespaceId}/${id}`, {
          state: { fromSidebar: true },
        });
        if (isMobile) setOpenMobile(false);
        toast.success(t('upload.success', { count: e.target.files.length }));
      })
      .catch(err => {
        toast.error(err?.message || t('upload.failed'));
      })
      .finally(() => {
        fileInputRef.current!.value = '';
      });
  };

  const handleMoveFinished = (resourceId: string, targetId: string) => {
    setMoveTo(false);
    useSidebarStore.getState().move(resourceId, targetId);
  };

  return {
    node,
    fileInputRef,
    moveTo,
    setMoveTo,
    createFolderOpen,
    setCreateFolderOpen,
    handleCreateFile,
    handleCreateFolderDirect,
    handleCreateFolderWithDialog,
    handleConfirmCreateFolder,
    handleEdit,
    handleRename,
    handleUpload,
    handleDelete,
    handleMoveTo,
    handleMoveFinished,
    handleAddToChat,
    handleAddAllToChat,
  };
}
