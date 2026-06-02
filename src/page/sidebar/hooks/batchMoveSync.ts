import type { Resource } from '@/interface';

import type { TreeNode } from '../store';
import { useSidebarStore } from '../store';
import { buildNodePath, isDescendant } from '../store/utils';

interface AppEventBus {
  fire: (...args: any[]) => void;
}

export function getCurrentResourceId(pathname: string, namespaceId: string) {
  const prefix = `/${namespaceId}/`;
  if (!pathname.startsWith(prefix)) {
    return undefined;
  }

  const [resourceId] = pathname.slice(prefix.length).split('/');
  if (!resourceId || resourceId === 'chat') {
    return undefined;
  }

  return resourceId;
}

export function getPreviousParentIds(
  nodes: Record<string, TreeNode>,
  ids: string[]
) {
  const parentIds: Record<string, string | null> = {};
  for (const id of ids) {
    if (nodes[id]) {
      parentIds[id] = nodes[id].parentId;
    }
  }
  return parentIds;
}

export function syncMoveResult(options: {
  app: AppEventBus;
  currentResourceId?: string;
  previousParentIds: Record<string, string | null>;
  movedIds: string[];
  targetId: string;
}) {
  const { app, currentResourceId, movedIds, previousParentIds, targetId } =
    options;
  const store = useSidebarStore.getState();
  const affectedParentIds = new Set<string>();

  for (const movedId of movedIds) {
    const previousParentId = previousParentIds[movedId];
    if (previousParentId) {
      affectedParentIds.add(previousParentId);
    }
  }
  affectedParentIds.add(targetId);

  for (const parentId of affectedParentIds) {
    app.fire('batch_move_resource_children_changed', parentId);
  }
  app.fire('refresh_loaded_smart_folders');

  if (!currentResourceId) {
    return;
  }

  const currentNode = store.nodes[currentResourceId];
  if (!currentNode) {
    return;
  }

  const movedCurrentResource = movedIds.some(
    id =>
      id === currentResourceId ||
      isDescendant(store.nodes, id, currentResourceId)
  );
  if (!movedCurrentResource) {
    return;
  }

  const path = buildNodePath(store.nodes, currentResourceId);
  if (!path) {
    return;
  }

  app.fire('update_resource', {
    id: currentResourceId,
    parent_id: currentNode.parentId ?? '',
    space_type: currentNode.spaceType,
    path,
  } as Resource);
}

export function syncSingleMoveResult(options: {
  app: AppEventBus;
  currentResourceId?: string;
  movedId: string;
  previousParentId: string | null;
  targetId: string;
}) {
  const { app, currentResourceId, movedId, previousParentId, targetId } =
    options;
  syncMoveResult({
    app,
    currentResourceId,
    previousParentIds: {
      [movedId]: previousParentId,
    },
    movedIds: [movedId],
    targetId,
  });
}
