import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useSidebar } from '@/components/ui/sidebar';
import useApp from '@/hooks/use-app';
import { useIsMobile } from '@/hooks/use-mobile';
import useSmartFolderEntitlements from '@/hooks/use-smart-folder-entitlements';
import { addToChatContext } from '@/lib/chat-bridge';
import { deleteResource } from '@/lib/delete-resource';
import { http } from '@/lib/request';
import {
  getSmartFolderSourceParentId,
  getSmartFolderSourceResourceId,
} from '@/page/sidebar/content/smart-folder-resource-utils';
import {
  CreateSmartFolderPayload,
  CreateSmartFolderRequest,
  SmartFolderResponse,
} from '@/page/sidebar/content/smart-folder-types';
import { useNode, useSidebarStore } from '@/page/sidebar/store';
import type { TreeNode } from '@/page/sidebar/store/types';
import { triggerGlobalFileUpload } from '@/page/sidebar/utils';

export interface UseNodeActionsReturn {
  node: ReturnType<typeof useNode>;

  moveTo: boolean;
  setMoveTo: (v: boolean) => void;
  smartFolderOpen: boolean;
  setSmartFolderOpen: (v: boolean) => void;
  smartFolderTrashOpen: boolean;
  setSmartFolderTrashOpen: (v: boolean) => void;
  smartFolderInitial: CreateSmartFolderPayload | null;
  smartFolderRetentionDays?: number;

  handleCreateFile: () => void;
  /** Creates a folder directly without a name dialog (context-menu path) */
  handleCreateFolderDirect: () => void;
  /** Opens the create-folder dialog (dropdown-menu path) */
  handleCreateFolderWithDialog: () => void;
  handleEdit: () => void;
  handleLocateSource: () => void;
  handleUpload: () => void;
  handleDelete: () => void;
  handleConfirmSmartFolderDelete: () => void;
  handleUpdateSmartFolder: (payload: CreateSmartFolderRequest) => Promise<void>;
  handleMoveTo: () => void;
  handleMoveFinished: (resourceId: string, targetId: string) => void;
  handleAddToChat: () => void;
  handleAddAllToChat: () => void;
}

function getNodeResource(node: TreeNode) {
  return {
    id: node.id,
    name: node.name,
    parent_id: node.parentId,
    resource_type: node.resourceType,
    space_type: node.spaceType,
    has_children: node.hasChildren,
    attrs: node.attrs,
  };
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
  const [smartFolderOpen, setSmartFolderOpen] = useState(false);
  const [smartFolderTrashOpen, setSmartFolderTrashOpen] = useState(false);
  const [smartFolderInitial, setSmartFolderInitial] =
    useState<CreateSmartFolderPayload | null>(null);
  const { data: smartFolderEntitlements } = useSmartFolderEntitlements({
    namespaceId,
    disabled: node?.resourceType !== 'smart_folder',
  });
  const isSmartFolderChild = node?.attrs?.__smart_folder_child === true;
  const sourceResourceId = node
    ? getSmartFolderSourceResourceId(getNodeResource(node))
    : nodeId;
  const sourceParentId = node
    ? getSmartFolderSourceParentId(getNodeResource(node))
    : undefined;

  const handleCreateFile = () => {
    if (
      node?.resourceType === 'smart_folder' ||
      node?.attrs?.__smart_folder_child
    ) {
      return;
    }

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
      .catch(() => {
        // request.ts handles backend error toasts.
      });
  };

  const handleCreateFolderDirect = () => {
    if (
      node?.resourceType === 'smart_folder' ||
      node?.attrs?.__smart_folder_child
    ) {
      return;
    }

    useSidebarStore
      .getState()
      .create(nodeId, 'folder')
      .then(() => {
        if (isMobile) setOpenMobile(false);
      })
      .catch(() => {
        // request.ts handles backend error toasts.
      });
  };

  const handleCreateFolderWithDialog = () => {
    if (
      node?.resourceType === 'smart_folder' ||
      node?.attrs?.__smart_folder_child
    ) {
      return;
    }

    useSidebarStore.getState().openCreateFolderDialog(nodeId);
  };

  const handleEdit = () => {
    if (node?.resourceType === 'smart_folder') {
      http
        .get(`/namespaces/${namespaceId}/smart-folders/${nodeId}/config`)
        .then((response: SmartFolderResponse) => {
          setSmartFolderInitial({
            name: response.resource.name || '',
            ownerScope: response.owner_scope || 'private',
            rootScope: response.root_scope || 'private',
            matchMode: response.match_mode || 'all',
            conditions: response.conditions || [],
          });
          setSmartFolderOpen(true);
        });
      return;
    }

    navigate(`/${namespaceId}/${sourceResourceId}/edit`, {
      state: isSmartFolderChild ? { sidebarActiveKey: nodeId } : undefined,
    });
    if (isMobile) setOpenMobile(false);
  };

  const handleLocateSource = () => {
    if (!sourceResourceId) return;
    app.fire('scroll_to_resource', sourceResourceId, sourceParentId);
  };

  const loc = useLocation();
  const addToContext = (type: 'resource' | 'folder') => {
    const contextResource =
      node && isSmartFolderChild
        ? {
            ...node,
            id: sourceResourceId,
            parentId: sourceParentId || node.parentId,
          }
        : node;
    const doAdd = () =>
      addToChatContext(contextResource!, type as 'resource' | 'folder');
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
    if (
      node?.resourceType === 'smart_folder' ||
      node?.attrs?.__smart_folder_child === true
    ) {
      return;
    }

    setMoveTo(true);
  };

  const handleDelete = () => {
    if (node?.resourceType === 'smart_folder') {
      setSmartFolderTrashOpen(true);
      return;
    }

    deleteResource({
      id: nodeId,
      parentId: node?.parentId ?? null,
      namespaceId,
      app,
      resourceType: node?.resourceType,
    });
  };

  const handleConfirmSmartFolderDelete = () => {
    setSmartFolderTrashOpen(false);
    deleteResource({
      id: nodeId,
      parentId: node?.parentId ?? null,
      namespaceId,
      app,
      resourceType: node?.resourceType,
    });
  };

  const handleUpdateSmartFolder = (payload: CreateSmartFolderRequest) => {
    if (!node) return Promise.reject();

    return http
      .patch(
        `/namespaces/${namespaceId}/smart-folders/${nodeId}/config`,
        payload
      )
      .then((response: SmartFolderResponse) => {
        const movedParentId =
          response.resource.parent_id &&
          response.resource.parent_id !== node.parentId
            ? response.resource.parent_id
            : '';
        const store = useSidebarStore.getState();

        store.patch(nodeId, { name: payload.name });
        if (movedParentId) {
          app.fire('move_resource', nodeId, movedParentId);
        }
        app.fire('update_resource', {
          ...response.resource,
          name: payload.name,
        });
        app.fire('refresh_smart_folder_children', nodeId);
        app.fire('smart_folder_entitlements_refetch');
        if (movedParentId) {
          app.fire('scroll_to_resource', nodeId, movedParentId);
        }
        toast.success(t('smart_folder.edit.success'));
      });
  };

  const handleUpload = () => {
    if (
      node?.resourceType === 'smart_folder' ||
      node?.attrs?.__smart_folder_child
    ) {
      return;
    }

    triggerGlobalFileUpload(nodeId);
  };

  const handleMoveFinished = async (resourceId: string, targetId: string) => {
    setMoveTo(false);
    await useSidebarStore
      .getState()
      .move(resourceId, targetId)
      .catch(() => {
        // request.ts handles backend error toasts.
      });
  };

  return {
    node,
    moveTo,
    setMoveTo,
    smartFolderOpen,
    setSmartFolderOpen,
    smartFolderTrashOpen,
    setSmartFolderTrashOpen,
    smartFolderInitial,
    smartFolderRetentionDays: smartFolderEntitlements?.trashRetentionDays,
    handleCreateFile,
    handleCreateFolderDirect,
    handleCreateFolderWithDialog,
    handleEdit,
    handleLocateSource,
    handleUpload,
    handleDelete,
    handleConfirmSmartFolderDelete,
    handleUpdateSmartFolder,
    handleMoveTo,
    handleMoveFinished,
    handleAddToChat,
    handleAddAllToChat,
  };
}
