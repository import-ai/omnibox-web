import { Resource } from '@/interface';

export function isSmartFolderChildResource(resource: Resource) {
  return resource.attrs?.__smart_folder_child === true;
}

export function getSmartFolderSourceResourceId(resource: Resource) {
  return isSmartFolderChildResource(resource)
    ? (resource.attrs?.__source_resource_id as string | undefined) ||
        resource.id
    : resource.id;
}

export function getSmartFolderSourceParentId(resource: Resource) {
  return isSmartFolderChildResource(resource)
    ? (resource.attrs?.__source_parent_id as string | undefined)
    : resource.parent_id;
}

export function getSmartFolderChildSidebarKey(
  parentId: string,
  sourceResourceId: string
) {
  return `smart-folder-child-${parentId}-${sourceResourceId}`;
}
