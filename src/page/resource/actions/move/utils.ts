import type { ResourceType } from '@/interface';

export function isSmartFolderResource(resourceType?: ResourceType) {
  return resourceType === 'smart_folder';
}

/**
 * Folders whose children are produced by the backend (rss folders own their
 * rss items) never accept user-placed resources.
 *
 * Deliberately narrower than the sidebar's isManagedChildrenNode, which also
 * covers smart folders: here a smart folder target is decided by the
 * source/target pairing in shouldDisableMoveTarget below, not by this test.
 * Widening this one would disable smart-folder-to-smart-folder moves, which is
 * a different question from what this predicate answers.
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
