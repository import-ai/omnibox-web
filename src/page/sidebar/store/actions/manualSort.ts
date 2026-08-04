import {
  fetchChildren,
  moveResource,
  updateManualSort,
} from '@/service/resource';

import type {
  PendingManualDrop,
  SidebarGet,
  SidebarSet,
  TreeNode,
} from '../types';
import { collapseEmptyNode, traverseDescendants } from '../utils';

function getRootId(node: TreeNode, rootIds: ReturnType<SidebarGet>['rootIds']) {
  return rootIds[node.spaceType];
}

export function buildManualOrder(
  children: string[],
  dragId: string,
  targetId: string,
  position: 'before' | 'after'
) {
  const ordered = children.filter(id => id !== dragId);
  const targetIndex = ordered.indexOf(targetId);
  if (targetIndex < 0) return children;
  ordered.splice(targetIndex + (position === 'after' ? 1 : 0), 0, dragId);
  return ordered;
}

export function buildManualSortActions(set: SidebarSet, get: SidebarGet) {
  return {
    setPendingManualDrop: (drop: PendingManualDrop | null) => {
      set(state => {
        state.dialogs.pendingManualDrop = drop;
      });
    },

    applyManualDrop: async (drop: PendingManualDrop) => {
      let state = get();
      const dragNode = state.nodes[drop.dragId];
      const targetNode = state.nodes[drop.targetId];
      if (!dragNode || !targetNode || !dragNode.parentId) return;

      if (
        drop.position === 'inside' &&
        targetNode.resourceType === 'folder' &&
        !state.ui[targetNode.id]?.loaded
      ) {
        const children = await fetchChildren(state.namespaceId, targetNode.id, {
          sort_by: 'manual',
          sort_order: 'asc',
        });
        get().refreshChildren(targetNode.id, children);
        state = get();
      }

      const currentDragNode = state.nodes[drop.dragId];
      const currentTargetNode = state.nodes[drop.targetId];
      if (!currentDragNode || !currentTargetNode || !currentDragNode.parentId) {
        return;
      }

      const sourceParent = state.nodes[currentDragNode.parentId];
      const targetParentId =
        drop.position === 'inside'
          ? currentTargetNode.id
          : currentTargetNode.parentId;
      const targetParent = targetParentId
        ? state.nodes[targetParentId]
        : undefined;
      if (!sourceParent || !targetParent) return;

      const permission = targetParent.currentPermission || 'full_access';
      if (permission !== 'can_edit' && permission !== 'full_access') return;

      const sourceChildren = sourceParent.children.filter(
        id => id !== currentDragNode.id
      );
      const targetChildren =
        sourceParent.id === targetParent.id
          ? sourceChildren
          : targetParent.children.filter(id => id !== currentDragNode.id);
      const nextTargetChildren =
        drop.position === 'inside'
          ? [...targetChildren, currentDragNode.id]
          : buildManualOrder(
              targetChildren,
              currentDragNode.id,
              currentTargetNode.id,
              drop.position
            );

      const rootId = getRootId(currentDragNode, state.rootIds);
      const targetRootId = getRootId(currentTargetNode, state.rootIds);
      if (!rootId || !targetRootId) return;

      const orders =
        sourceParent.id === targetParent.id
          ? [{ parent_id: sourceParent.id, resource_ids: nextTargetChildren }]
          : [
              { parent_id: sourceParent.id, resource_ids: sourceChildren },
              { parent_id: targetParent.id, resource_ids: nextTargetChildren },
            ];

      if (rootId === targetRootId) {
        await updateManualSort(state.namespaceId, {
          root_resource_id: rootId,
          ...(sourceParent.id !== targetParent.id
            ? {
                resource_id: currentDragNode.id,
                target_parent_id: targetParent.id,
              }
            : {}),
          orders,
        });
      } else {
        await moveResource(
          state.namespaceId,
          currentDragNode.id,
          targetParent.id
        );
        await Promise.all([
          updateManualSort(state.namespaceId, {
            root_resource_id: rootId,
            orders: [orders[0]],
          }),
          updateManualSort(state.namespaceId, {
            root_resource_id: targetRootId,
            orders: [orders[orders.length - 1]],
          }),
        ]);
      }

      set(current => {
        const currentDrag = current.nodes[currentDragNode.id];
        const currentSource = current.nodes[sourceParent.id];
        const currentTarget = current.nodes[targetParent.id];
        if (!currentDrag || !currentSource || !currentTarget) return;

        if (currentSource.id !== currentTarget.id) {
          currentSource.children = sourceChildren;
          collapseEmptyNode(current, currentSource.id);
          currentDrag.parentId = currentTarget.id;
          traverseDescendants(current.nodes, currentDrag.id, node => {
            node.spaceType = currentTarget.spaceType;
          });
        }
        currentTarget.children = nextTargetChildren;
        currentTarget.hasChildren = nextTargetChildren.length > 0;
      });
    },
  };
}
