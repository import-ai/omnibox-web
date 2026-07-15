import type { ResourceMeta } from '@/interface';

interface ExpandableResource {
  children?: unknown[];
  has_children?: boolean;
  id: string;
  resource_type: ResourceMeta['resource_type'];
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
      shouldExpandResourceNode(resource) &&
      !childrenById[resource.id]
  );
}

export function shouldExpandResourceNode(
  resource: ExpandableResource
): boolean {
  return Boolean(resource.has_children);
}

interface ExpandAllResourceNodesOptions<T extends ExpandableResource> {
  onNodeLoadEnd?: (resourceId: string) => void;
  onNodeLoadStart?: (resourceId: string) => void;
  onUpdate?: (state: {
    childrenById: Record<string, T[]>;
    expandedIds: Set<string>;
  }) => void;
}

/** Recursively expands every node with children, matching share sidebar behavior. */
export async function expandAllResourceNodes<T extends ExpandableResource>(
  roots: T[],
  loadChildren: (resource: T) => Promise<T[]>,
  initialChildrenById: Record<string, T[]> = {},
  options: ExpandAllResourceNodesOptions<T> = {}
): Promise<{
  childrenById: Record<string, T[]>;
  expandedIds: Set<string>;
}> {
  const childrenById = { ...initialChildrenById };
  const expandedIds = new Set<string>();
  const visited = new Set<string>();

  const publish = () => {
    options.onUpdate?.({
      childrenById: { ...childrenById },
      expandedIds: new Set(expandedIds),
    });
  };

  const expandRecursive = async (resource: T): Promise<void> => {
    if (visited.has(resource.id)) return;
    visited.add(resource.id);
    if (!shouldExpandResourceNode(resource)) return;

    if (!childrenById[resource.id]) {
      options.onNodeLoadStart?.(resource.id);
      try {
        childrenById[resource.id] = await loadChildren(resource);
      } catch (error) {
        console.error('Failed to load resource picker children', error);
        return;
      } finally {
        options.onNodeLoadEnd?.(resource.id);
      }
    }

    expandedIds.add(resource.id);
    publish();

    await Promise.allSettled(
      (childrenById[resource.id] ?? [])
        .filter(shouldExpandResourceNode)
        .map(child => expandRecursive(child))
    );
  };

  await Promise.all(roots.map(root => expandRecursive(root)));

  return { childrenById, expandedIds };
}
