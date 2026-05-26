import {
  getSmartFolderChildSidebarKey,
  getSmartFolderSourceResourceId,
} from '@/page/sidebar/content/smart-folder';

interface ShareNavigationResource {
  id: string;
  parentId: string | null;
  attrs?: Record<string, unknown>;
}

export function getShareResourceNavigationTarget(
  resource: ShareNavigationResource
) {
  const sourceResourceId = getSmartFolderSourceResourceId({
    id: resource.id,
    parent_id: resource.parentId || '',
    attrs: resource.attrs,
  });
  const isSmartFolderChild = sourceResourceId !== resource.id;

  return {
    resourceId: sourceResourceId,
    sidebarActiveKey: isSmartFolderChild ? resource.id : undefined,
  };
}

export function getShareSmartFolderChildNavigationState(
  smartFolderParentId: string,
  resourceId: string
) {
  return {
    sidebarActiveKey: getSmartFolderChildSidebarKey(
      smartFolderParentId,
      resourceId
    ),
    skipShareSidebarPathExpand: true,
    sidebarExpandParentId: smartFolderParentId,
  };
}
