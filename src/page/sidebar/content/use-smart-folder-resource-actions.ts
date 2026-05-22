import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import useApp from '@/hooks/use-app';
import { IResourceData, SpaceType } from '@/interface';
import { http } from '@/lib/request';
import { useSidebarStore } from '@/page/sidebar/store';

import {
  getSmartFolderChildSidebarKey,
  getSmartFolderSourceParentId,
  getSmartFolderSourceResourceId,
} from './smart-folder-resource-utils';
import {
  CreateSmartFolderPayload,
  CreateSmartFolderRequest,
  SmartFolderResponse,
} from './smart-folder-types';

function findResourceById(
  resource: IResourceData | undefined,
  resourceId: string
): IResourceData | undefined {
  if (!resource) return undefined;
  if (resource.id === resourceId) return resource;

  for (const child of resource.children || []) {
    const found = findResourceById(child, resourceId);
    if (found) return found;
  }

  return undefined;
}

interface UseSmartFolderResourceActionsOptions {
  data: IResourceData;
  namespaceId?: string;
  spaceRoot?: IResourceData;
  onActiveKey: (id: string, open?: boolean, key?: string) => void;
  onDelete: (spaceType: SpaceType, id: string, parentId: string) => void;
  spaceType: SpaceType;
  closeMenu?: () => void;
}

export function useSmartFolderResourceActions(
  opts: UseSmartFolderResourceActionsOptions
) {
  const {
    data,
    namespaceId,
    spaceRoot,
    onActiveKey,
    onDelete,
    spaceType,
    closeMenu,
  } = opts;
  const app = useApp();
  const { t } = useTranslation();

  const [editSmartFolderOpen, setEditSmartFolderOpen] = useState(false);
  const [trashSmartFolderConfirmOpen, setTrashSmartFolderConfirmOpen] =
    useState(false);
  const [smartFolderInitial, setSmartFolderInitial] =
    useState<CreateSmartFolderPayload | null>(null);

  const isSmartFolder = data.resource_type === 'smart_folder';
  const isSmartFolderChild = data.attrs?.__smart_folder_child === true;
  const canEditSmartFolder =
    (data.current_permission || 'full_access') === 'can_edit' ||
    (data.current_permission || 'full_access') === 'full_access';
  const siblingResources =
    findResourceById(spaceRoot, data.parent_id)?.children ?? [];

  const handleLocateSource = () => {
    const sourceResourceId = getSmartFolderSourceResourceId(data);
    const sourceParentId = getSmartFolderSourceParentId(data);
    if (!sourceResourceId) return;
    app.fire('scroll_to_resource', sourceResourceId, sourceParentId);
    closeMenu?.();
  };

  const handleEdit = () => {
    const sourceResourceId = getSmartFolderSourceResourceId(data);

    onActiveKey(
      sourceResourceId,
      true,
      isSmartFolderChild
        ? getSmartFolderChildSidebarKey(data.parent_id, sourceResourceId)
        : undefined
    );
  };

  const handleEditSmartFolder = () => {
    if (!canEditSmartFolder) {
      toast.error(t('permission.edit_required'));
      return;
    }
    if (!namespaceId) return;

    http
      .get(`/namespaces/${namespaceId}/smart-folders/${data.id}/config`)
      .then((response: SmartFolderResponse) => {
        setSmartFolderInitial({
          name: response.resource.name || '',
          ownerScope: response.owner_scope || 'private',
          rootScope: response.root_scope || 'private',
          matchMode: response.match_mode || 'all',
          conditions: response.conditions || [],
        });
        setEditSmartFolderOpen(true);
      });
  };

  const handleUpdateSmartFolder = (payload: CreateSmartFolderRequest) => {
    if (!namespaceId) return Promise.reject();

    return http
      .patch(
        `/namespaces/${namespaceId}/smart-folders/${data.id}/config`,
        payload
      )
      .then((response: SmartFolderResponse) => {
        const movedParentId =
          response.resource.parent_id &&
          response.resource.parent_id !== data.parent_id
            ? response.resource.parent_id
            : '';
        const store = useSidebarStore.getState();

        if (movedParentId) {
          store.moveLocal(data.id, movedParentId);
        }
        app.fire('update_resource', {
          ...response.resource,
          name: payload.name,
        });
        app.fire('refresh_smart_folder_children', data.id);
        useSidebarStore.getState().refetchSmartFolderEntitlements();
        if (movedParentId) {
          app.fire('scroll_to_resource', data.id, movedParentId);
        } else {
          onActiveKey(data.id);
        }
        toast.success(t('smart_folder.edit.success'));
      });
  };

  const handleDelete = () => {
    if (isSmartFolder) {
      if (!canEditSmartFolder) {
        toast.error(t('permission.delete_required'));
        return;
      }
      setTrashSmartFolderConfirmOpen(true);
      return;
    }

    onDelete(spaceType, data.id, data.parent_id);
  };

  const handleConfirmDeleteSmartFolder = () => {
    setTrashSmartFolderConfirmOpen(false);
    onDelete(spaceType, data.id, data.parent_id);
  };

  return {
    editSmartFolderOpen,
    setEditSmartFolderOpen,
    trashSmartFolderConfirmOpen,
    setTrashSmartFolderConfirmOpen,
    smartFolderInitial,
    isSmartFolder,
    isSmartFolderChild,
    canEditSmartFolder,
    siblingResources,
    handleLocateSource,
    handleEdit,
    handleEditSmartFolder,
    handleUpdateSmartFolder,
    handleDelete,
    handleConfirmDeleteSmartFolder,
  };
}
