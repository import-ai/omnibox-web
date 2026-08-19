import type { ResourceType } from '@/interface';
import { useSidebarStore } from '@/page/sidebar/store';
import { getNodeResourceSort } from '@/page/sidebar/store/utils';
import { fetchChildren } from '@/service/resource';

interface AppEventBus {
  fire: (...args: any[]) => void;
}

export function getResourceParentsToRefresh(options: {
  previousParentId: string | null | undefined;
  nextParentId: string | null | undefined;
  nodes: Record<string, { resourceType?: ResourceType }>;
}): string[] {
  const { previousParentId, nextParentId, nodes } = options;
  const parentIds: string[] = [];

  const shouldRefresh = (parentId: string) =>
    nodes[parentId]?.resourceType !== 'smart_folder';

  if (nextParentId && shouldRefresh(nextParentId)) {
    parentIds.push(nextParentId);
  }
  if (
    previousParentId &&
    previousParentId !== nextParentId &&
    shouldRefresh(previousParentId)
  ) {
    parentIds.push(previousParentId);
  }

  return parentIds;
}

/**
 * Reload a folder's children in the sidebar, then notify the open folder
 * resource list. LLM move/create tools only fire refresh events; UI moves
 * already notify the folder page via batch_move_resource_children_changed.
 */
export async function refreshSidebarResourceChildren(options: {
  app: AppEventBus;
  namespaceId: string;
  resourceId: string;
}): Promise<void> {
  const { app, namespaceId, resourceId } = options;
  if (!resourceId) {
    return;
  }

  try {
    const store = useSidebarStore.getState();
    if (!store.nodes[resourceId]) {
      await store.expandPathTo(resourceId, { expandTarget: true });
    }

    const children = await fetchChildren(
      namespaceId,
      resourceId,
      getNodeResourceSort(useSidebarStore.getState(), resourceId)
    );
    useSidebarStore.getState().refreshChildren(resourceId, children);
  } finally {
    app.fire('batch_move_resource_children_changed', resourceId);
  }
}
