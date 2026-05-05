import { useState } from 'react';

import useApp from '@/hooks/use-app';
import { IResourceData } from '@/interface';
import { http } from '@/lib/request';
import { ISidebarProps } from '@/page/sidebar/interface';

import {
  getSmartFolderChildSidebarKey,
  getSmartFolderSourceParentId,
  getSmartFolderSourceResourceId,
} from './smart-folder-resource-utils';
import {
  CreateSmartFolderPayload,
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
  data: ISidebarProps['data'];
  namespaceId?: string;
  spaceRoot?: ISidebarProps['data'];
  onActiveKey: ISidebarProps['onActiveKey'];
  onDelete: ISidebarProps['onDelete'];
  spaceType: ISidebarProps['spaceType'];
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
    const sourceParentId = getSmartFolderSourceParentId(data) || data.parent_id;

    onActiveKey(
      sourceResourceId,
      true,
      isSmartFolderChild
        ? getSmartFolderChildSidebarKey(sourceParentId, sourceResourceId)
        : undefined
    );
  };

  const handleEditSmartFolder = () => {
    if (!canEditSmartFolder || !namespaceId) return;

    http
      .get(`/namespaces/${namespaceId}/smart-folders/${data.id}/config`)
      .then((response: SmartFolderResponse) => {
        setSmartFolderInitial({
          name: response.resource.name || '',
          ownerScope: response.ownerScope || response.owner_scope || 'private',
          rootScope: response.rootScope || response.root_scope || 'private',
          matchMode: response.matchMode || response.match_mode || 'all',
          conditions: response.conditions || [],
        });
        setEditSmartFolderOpen(true);
      });
  };

  const handleUpdateSmartFolder = (payload: CreateSmartFolderPayload) => {
    if (!namespaceId) return Promise.reject();

    return http
      .patch(
        `/namespaces/${namespaceId}/smart-folders/${data.id}/config`,
        payload
      )
      .then((response: SmartFolderResponse) => {
        app.fire('update_resource', {
          ...response.resource,
          name: payload.name,
        });
        app.fire('refresh_smart_folder_children', data.id);
        onActiveKey(data.id);
      });
  };

  const handleDelete = () => {
    if (isSmartFolder) {
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
