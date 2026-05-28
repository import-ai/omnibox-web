import type App from '@/hooks/app.class';
import type { SidebarStore } from '@/page/sidebar/store/types';

import type { CreateSmartFolderRequest, SmartFolderResponse } from './index';

type SmartFolderUpdateStore = Pick<
  SidebarStore,
  'patch' | 'move' | 'refetchSmartFolderEntitlements'
>;

interface SyncSmartFolderUpdateOptions {
  app: Pick<App, 'fire'>;
  store: SmartFolderUpdateStore;
  nodeId: string;
  nodeParentId?: string | null;
  payload: CreateSmartFolderRequest;
  response: SmartFolderResponse;
}

export function syncSmartFolderUpdate({
  app,
  store,
  nodeId,
  nodeParentId,
  payload,
  response,
}: SyncSmartFolderUpdateOptions) {
  const updatedResource = {
    ...response.resource,
    name: payload.name,
  };
  const movedParentId =
    response.resource.parent_id && response.resource.parent_id !== nodeParentId
      ? response.resource.parent_id
      : '';

  store.patch(nodeId, { name: payload.name });
  if (movedParentId) {
    store.move(nodeId, movedParentId, true);
  }
  app.fire('update_resource', updatedResource);
  app.fire('refresh_smart_folder_children', nodeId);
  store.refetchSmartFolderEntitlements();

  return { movedParentId };
}
