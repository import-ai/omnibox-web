import type { ResourceType } from '@/interface';

export function isSmartFolderResource(resourceType?: ResourceType) {
  return resourceType === 'smart_folder';
}

export function isManagedChildrenFolder(resourceType?: ResourceType) {
  return resourceType === 'rss_folder' || resourceType === 'smart_folder';
}

export function shouldDisableMoveTarget(
  sourceResourceType: ResourceType | undefined,
  targetResourceType: ResourceType | undefined
) {
  if (!targetResourceType) {
    return false;
  }

  return (
    isManagedChildrenFolder(targetResourceType) ||
    (sourceResourceType !== undefined &&
      isSmartFolderResource(sourceResourceType) !==
        isSmartFolderResource(targetResourceType))
  );
}
