import type { ResourceType } from '@/interface';

export function isSmartFolderResource(resourceType?: ResourceType) {
  return resourceType === 'smart_folder';
}

/**
 * Folders whose children are produced by the backend (rss folders own their
 * rss items) never accept user-placed resources.
 */
export function isManagedChildrenFolder(resourceType?: ResourceType) {
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
    isManagedChildrenFolder(targetResourceType) ||
    isSmartFolderResource(sourceResourceType) !==
      isSmartFolderResource(targetResourceType)
  );
}
