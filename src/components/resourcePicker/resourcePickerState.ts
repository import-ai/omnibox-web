import type { ResourceMeta } from '@/interface';

interface ExpandableResource {
  children?: unknown[];
  has_children?: boolean;
  id: string;
  resource_type: ResourceMeta['resource_type'];
}

export function shouldAutoExpandSharedRoot(
  resource: ExpandableResource,
  canBrowseResources: boolean
): boolean {
  return (
    canBrowseResources &&
    Boolean(resource.has_children) &&
    (resource.resource_type === 'folder' ||
      resource.resource_type === 'smart_folder')
  );
}

export function getInitialExpandedIds<T extends ExpandableResource>(
  roots: T[],
  defaultExpandedRootIds: string[] = []
): Set<string> {
  const defaultExpandedIds = new Set(defaultExpandedRootIds);
  return new Set(
    roots
      .filter(
        resource =>
          resource.children?.length || defaultExpandedIds.has(resource.id)
      )
      .map(resource => resource.id)
  );
}

export function getInitialChildrenLoadTargets<T extends ExpandableResource>(
  roots: T[],
  childrenById: Record<string, unknown[]>,
  expandedIds: Set<string>
): T[] {
  return roots.filter(
    resource =>
      expandedIds.has(resource.id) &&
      Boolean(resource.has_children) &&
      !childrenById[resource.id]
  );
}
