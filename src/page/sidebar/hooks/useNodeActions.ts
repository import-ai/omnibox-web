import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useSidebar } from '@/components/ui/Sidebar';
import useApp from '@/hooks/useApp';
import { useIsMobile } from '@/hooks/useMobile';
import type { Resource } from '@/interface';
import { addToChatContext } from '@/lib/chatBridge';
import { deleteResource } from '@/lib/deleteResource';
import { http } from '@/lib/request';
import {
  getSmartFolderSourceParentId,
  getSmartFolderSourceResourceId,
  isSmartFolderChildResource,
  SmartFolderResponse,
} from '@/page/sidebar/components/smart-folder';
import { useNode, useSidebarStore } from '@/page/sidebar/store';
import type { TreeNode } from '@/page/sidebar/store/types';
import { triggerGlobalFileUpload } from '@/page/sidebar/utils';

import { getCurrentResourceId, syncSingleMoveResult } from './batchMoveSync';

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
  handleLocateSource: () => void;
  handleUpload: () => void;
  handleDelete: () => void;
  handleMoveTo: () => void;
  handleMoveFinished: (resourceIds: string[], targetId: string) => void;
  handleAddToChat: () => void;
  handleAddAllToChat: () => void;
}

function getNodeResource(
  node: TreeNode
): Pick<
  Resource,
  | 'id'
  | 'name'
  | 'parent_id'
  | 'resource_type'
  | 'space_type'
  | 'has_children'
  | 'attrs'
> {
  return {
    id: node.id,
    name: node.name,
    parent_id: node.parentId || '',
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
  const loc = useLocation();

  const [moveTo, setMoveTo] = useState(false);
  const isSmartFolderChild = node ? isSmartFolderChildResource(node) : false;
  const canModifyNode =
    (node?.currentPermission || 'full_access') === 'can_edit' ||
    (node?.currentPermission || 'full_access') === 'full_access';
  const sourceResourceId = node
    ? getSmartFolderSourceResourceId(getNodeResource(node))
    : nodeId;
  const sourceParentId = node
    ? getSmartFolderSourceParentId(getNodeResource(node))
    : undefined;

  const handleCreateFile = () => {
    if (node?.resourceType === 'smart_folder' || isSmartFolderChild) {
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
    if (node?.resourceType === 'smart_folder' || isSmartFolderChild) {
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
    if (node?.resourceType === 'smart_folder' || isSmartFolderChild) {
      return;
    }

    useSidebarStore.getState().openCreateFolderDialog(nodeId);
  };

  const handleEdit = () => {
    if (node?.resourceType === 'smart_folder') {
      if (!canModifyNode) {
        toast.error(t('permission.edit_required'));
        return;
      }
      http
        .get(`/namespaces/${namespaceId}/smart-folders/${nodeId}/config`)
        .then((response: SmartFolderResponse) => {
          useSidebarStore.getState().openEditSmartFolderDialog(nodeId, {
            name: response.resource.name || '',
            ownerScope: response.owner_scope || 'private',
            rootScope: response.root_scope || 'private',
            matchMode: response.match_mode || 'all',
            conditions: response.conditions || [],
          });
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
    if (node?.resourceType === 'smart_folder' || isSmartFolderChild) {
      return;
    }

    setMoveTo(true);
  };

  const handleDelete = () => {
    if (node?.resourceType === 'smart_folder') {
      if (!canModifyNode) {
        toast.error(t('permission.delete_required'));
        return;
      }
      useSidebarStore.getState().openSmartFolderTrashDialog(nodeId);
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

  const handleUpload = () => {
    if (node?.resourceType === 'smart_folder' || isSmartFolderChild) {
      return;
    }

    triggerGlobalFileUpload(nodeId);
  };

  const handleMoveFinished = async (
    resourceIds: string[],
    targetId: string
  ) => {
    setMoveTo(false);
    const [resourceId] = resourceIds;
    if (!resourceId) return;

    const previousParentId =
      useSidebarStore.getState().nodes[resourceId]?.parentId ?? null;
    await useSidebarStore
      .getState()
      .move(resourceId, targetId)
      .then(() => {
        syncSingleMoveResult({
          app,
          currentResourceId: getCurrentResourceId(loc.pathname, namespaceId),
          movedId: resourceId,
          previousParentId,
          targetId,
        });
      })
      .catch(() => {
        // request.ts handles backend error toasts.
      });
  };

  return {
    node,
    moveTo,
    setMoveTo,
    handleCreateFile,
    handleCreateFolderDirect,
    handleCreateFolderWithDialog,
    handleEdit,
    handleLocateSource,
    handleUpload,
    handleDelete,
    handleMoveTo,
    handleMoveFinished,
    handleAddToChat,
    handleAddAllToChat,
  };
}
