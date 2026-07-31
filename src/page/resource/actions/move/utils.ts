import type { ResourceType } from '@/interface';

export function isSmartFolderResource(resourceType?: ResourceType) {
  return resourceType === 'smart_folder';
}

export function isRssFolderResource(resourceType?: ResourceType) {
  return resourceType === 'rss_folder';
}

export function shouldDisableMoveTarget(
  sourceResourceType: ResourceType | undefined,
  targetResourceType: ResourceType | undefined
) {
  if (!sourceResourceType || !targetResourceType) {
    return false;
  }

  return (
    isRssFolderResource(targetResourceType) ||
    isSmartFolderResource(sourceResourceType) !==
      isSmartFolderResource(targetResourceType)
  );
}
