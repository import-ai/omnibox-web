import type { Resource, SpaceType } from '@/interface';
import { addToChatContext, removeFromChatContext } from '@/lib/chatBridge';
import {
  batchCreateFolderFromResources,
  batchDeleteResources,
  batchMoveResources,
} from '@/service/resource';

import type {
  BatchOperationResult,
  SidebarGet,
  SidebarSet,
  SidebarStore,
} from '../types';
import {
  collapseEmptyNode,
  createNode,
  ensureUI,
  findNextActiveId,
  getBatchSelectionSummary,
  getDescendantIds,
  getIdsInVisibleRange,
  getSelectedAncestorId,
  getTopLevelSelectedIds,
  isBatchSelectableNode,
  isDescendant,
  traverseDescendants,
} from '../utils';

export function buildBatchActions(set: SidebarSet, get: SidebarGet) {
  const isTargetNotEditableError = (error: unknown) =>
    (error as any)?.response?.data?.code === 'target_not_editable';

  const finishBatchSelection = (s: SidebarStore) => {
    s.selectionMode = Object.keys(s.selectedIds).length > 0;
    if (!s.selectionMode) {
      s.lastSelectedId = null;
    }
  };

  return {
    toggleSelection: (id: string, rangeStartId?: string) => {
      set(s => {
        const targetIds = rangeStartId
          ? getIdsInVisibleRange(s, rangeStartId, id)
          : [id];

        for (const targetId of targetIds) {
          if (!isBatchSelectableNode(s.nodes[targetId])) {
            continue;
          }

          const selected = Boolean(s.selectedIds[targetId]);
          const selectedAncestorId = getSelectedAncestorId(
            s.nodes,
            s.selectedIds,
            targetId
          );

          if (!rangeStartId && selectedAncestorId) {
            delete s.selectedIds[selectedAncestorId];
            const excludedIds = new Set([
              targetId,
              ...getDescendantIds(s.nodes, targetId),
            ]);
            for (const descendantId of getDescendantIds(
              s.nodes,
              selectedAncestorId
            )) {
              if (excludedIds.has(descendantId)) {
                delete s.selectedIds[descendantId];
              } else {
                s.selectedIds[descendantId] = true;
              }
            }
          } else if (rangeStartId || !selected) {
            s.selectedIds[targetId] = true;
            for (const descendantId of getDescendantIds(s.nodes, targetId)) {
              delete s.selectedIds[descendantId];
            }
          } else {
            delete s.selectedIds[targetId];
            for (const descendantId of getDescendantIds(s.nodes, targetId)) {
              delete s.selectedIds[descendantId];
            }
          }

          let parentId = s.nodes[targetId]?.parentId;
          while (parentId) {
            const parent = s.nodes[parentId];
            if (!parent) break;
            if (parent.parentId) {
              delete s.selectedIds[parentId];
            }
            parentId = parent.parentId;
          }
        }

        s.lastSelectedId = id;
        if (Object.keys(s.selectedIds).length === 0) {
          s.lastSelectedId = null;
        }
      });
    },

    selectAll: (spaceType?: SpaceType) => {
      set(s => {
        const spaces = spaceType
          ? [spaceType]
          : (Object.keys(s.rootIds) as SpaceType[]);
        for (const type of spaces) {
          const root = s.nodes[s.rootIds[type]];
          if (!root) continue;
          for (const childId of root.children) {
            if (!isBatchSelectableNode(s.nodes[childId])) {
              continue;
            }
            s.selectedIds[childId] = true;
          }
        }

        s.selectionMode = true;
      });
    },

    clearSelection: () => {
      set(s => {
        s.selectedIds = {};
        s.lastSelectedId = null;
      });
    },

    deselectAll: () => {
      set(s => {
        s.selectedIds = {};
        s.selectionMode = false;
        s.lastSelectedId = null;
      });
    },

    setSelectionMode: (enabled: boolean) => {
      set(s => {
        s.selectionMode = enabled;
        if (!enabled) {
          s.selectedIds = {};
          s.lastSelectedId = null;
        }
      });
    },

    setBatchDragging: (dragging: boolean) => {
      set(s => {
        if (s.batchDragging === dragging) return;
        s.batchDragging = dragging;
      });
    },

    batchRemove: async (ids: string[], currentResourceId?: string) => {
      const requestedIds = getTopLevelSelectedIds(get().nodes, ids);
      const result: BatchOperationResult = { success: [], failed: [] };

      try {
        const response = await batchDeleteResources(
          get().namespaceId,
          requestedIds
        );
        result.success = response.success_ids.filter(id =>
          requestedIds.includes(id)
        );
        result.failed = response.failed_ids
          .filter(id => requestedIds.includes(id))
          .map(id => ({ id, error: new Error('Delete failed') }));
      } catch (error) {
        result.failed = requestedIds.map(id => ({
          id,
          error: error as Error,
        }));
      }

      const chatContextRemovedIds = result.success.flatMap(id => [
        id,
        ...getDescendantIds(get().nodes, id),
      ]);
      const removedIds = new Set(chatContextRemovedIds);
      const deletedActiveId = result.success.find(id => {
        if (!currentResourceId) {
          return false;
        }
        return (
          id === currentResourceId ||
          getDescendantIds(get().nodes, id).includes(currentResourceId)
        );
      });
      const nextActiveId = deletedActiveId
        ? findNextActiveId(get().nodes, deletedActiveId, removedIds)
        : null;
      set(s => {
        for (const id of result.success) {
          const node = s.nodes[id];
          const parentId = node?.parentId ?? null;
          const descendantIds = getDescendantIds(s.nodes, id);

          if (parentId) {
            const parent = s.nodes[parentId];
            if (parent) {
              parent.children = parent.children.filter(cid => cid !== id);
              collapseEmptyNode(s, parentId);
            }
          }

          for (const removedId of [...descendantIds, id]) {
            delete s.nodes[removedId];
            delete s.ui[removedId];
            delete s.selectedIds[removedId];
            if (s.activeId === removedId) {
              s.activeId = null;
            }
          }
        }
        if (deletedActiveId) {
          s.activeId = nextActiveId;
          result.nextId = nextActiveId;
          result.navigateToChat = !nextActiveId;
        }
        finishBatchSelection(s);
      });
      removeFromChatContext(chatContextRemovedIds);

      return result;
    },

    batchMove: async (ids: string[], targetId: string) => {
      const requestedIds = getTopLevelSelectedIds(get().nodes, ids);
      const selection = getBatchSelectionSummary(get().nodes, requestedIds);
      if (selection.hasSmartFolder) {
        return {
          success: [],
          failed: requestedIds.map(id => ({
            id,
            error: new Error('Smart folders do not support this operation'),
          })),
          nameConflictIds: [],
          smartFolderUnsupported: true,
        };
      }
      const result: BatchOperationResult = {
        success: [],
        failed: [],
        nameConflictIds: [],
      };
      const snapshots = new Map<
        string,
        {
          parentId: string | null;
          index: number;
          spaceType: SpaceType;
          descendantSpaceTypes: Record<string, SpaceType>;
        }
      >();

      const validIds: string[] = [];
      for (const id of requestedIds) {
        if (!get().nodes[id]) {
          result.failed.push({ id, error: new Error('Source not found') });
        } else if (id === targetId || isDescendant(get().nodes, id, targetId)) {
          result.failed.push({
            id,
            error: new Error('Cannot move to self or descendant'),
          });
        } else {
          validIds.push(id);
        }
      }

      const applyMove = (
        s: SidebarStore,
        moveIds: string[],
        optimistic: boolean
      ) => {
        const newParent = s.nodes[targetId];
        const newParentUI = newParent ? ensureUI(s, targetId) : null;

        for (const id of moveIds) {
          const node = s.nodes[id];
          if (!node) continue;
          const oldParentId = node.parentId;
          if (optimistic && !snapshots.has(id)) {
            const oldParent = oldParentId ? s.nodes[oldParentId] : null;
            const descendantSpaceTypes: Record<string, SpaceType> = {};
            traverseDescendants(s.nodes, id, descendant => {
              descendantSpaceTypes[descendant.id] = descendant.spaceType;
            });
            snapshots.set(id, {
              parentId: oldParentId,
              index: oldParent ? oldParent.children.indexOf(id) : -1,
              spaceType: node.spaceType,
              descendantSpaceTypes,
            });
          }
          if (oldParentId) {
            const oldParent = s.nodes[oldParentId];
            if (oldParent) {
              oldParent.children = oldParent.children.filter(cid => cid !== id);
            }
          }

          if (newParent) {
            if (!newParent.children.includes(id)) {
              newParent.children.unshift(id);
            }
            newParent.hasChildren = true;
            if (newParentUI) {
              newParentUI.expanded = true;
            }
            node.parentId = targetId;
            node.spaceType = newParent.spaceType;
          }

          traverseDescendants(s.nodes, id, descendant => {
            if (newParent) {
              descendant.spaceType = newParent.spaceType;
            }
            const ui = s.ui[descendant.id];
            if (ui) ui.expanded = false;
          });
        }
      };

      if (validIds.length > 0 && get().nodes[targetId]) {
        set(s => {
          applyMove(s, validIds, true);
        });
      }

      if (validIds.length > 0) {
        try {
          const response = await batchMoveResources(
            get().namespaceId,
            validIds,
            targetId
          );
          result.success = response.success_ids.filter(id =>
            validIds.includes(id)
          );
          result.nameConflictIds = (response.name_conflict_ids ?? []).filter(
            id => validIds.includes(id)
          );
          result.failed.push(
            ...response.failed_ids
              .filter(id => validIds.includes(id))
              .map(id => ({ id, error: new Error('Move failed') }))
          );
        } catch (error) {
          const isTargetError = isTargetNotEditableError(error);
          result.targetError = isTargetError ? error : undefined;
          result.failed.push(
            ...validIds.map(id => ({
              id,
              error: isTargetError
                ? new Error('Target is not editable')
                : (error as Error),
            }))
          );
        }
      }

      set(s => {
        const successSet = new Set(result.success);
        const sourceParentIds = new Set<string>();
        for (const item of result.failed) {
          const snapshot = snapshots.get(item.id);
          const node = s.nodes[item.id];
          if (!snapshot || !node) {
            continue;
          }

          const currentParentId = node.parentId;
          if (currentParentId) {
            const currentParent = s.nodes[currentParentId];
            if (currentParent) {
              currentParent.children = currentParent.children.filter(
                cid => cid !== item.id
              );
              collapseEmptyNode(s, currentParentId);
            }
          }

          if (snapshot.parentId) {
            sourceParentIds.add(snapshot.parentId);
            const oldParent = s.nodes[snapshot.parentId];
            if (oldParent && !oldParent.children.includes(item.id)) {
              const insertIndex =
                snapshot.index >= 0
                  ? snapshot.index
                  : oldParent.children.length;
              oldParent.children.splice(insertIndex, 0, item.id);
              oldParent.hasChildren = true;
            }
          }
          node.parentId = snapshot.parentId;
          node.spaceType = snapshot.spaceType;

          traverseDescendants(s.nodes, item.id, descendant => {
            descendant.spaceType =
              snapshot.descendantSpaceTypes[descendant.id] ??
              snapshot.spaceType;
          });
        }

        const unappliedSuccessIds = result.success.filter(
          id => !snapshots.has(id)
        );
        if (unappliedSuccessIds.length > 0) {
          applyMove(s, unappliedSuccessIds, false);
        }

        for (const id of result.success) {
          const snapshot = snapshots.get(id);
          if (snapshot?.parentId) {
            sourceParentIds.add(snapshot.parentId);
          }
          if (successSet.has(id)) {
            const movedIds = [id, ...getDescendantIds(s.nodes, id)];
            for (const movedId of movedIds) {
              delete s.selectedIds[movedId];
            }
          }
        }
        for (const parentId of sourceParentIds) {
          collapseEmptyNode(s, parentId);
        }
        finishBatchSelection(s);
      });

      if (result.targetError) {
        throw result.targetError;
      }

      return result;
    },

    batchCreate: async (folderName: string, parentId: string) => {
      const selectedIds = Object.keys(get().selectedIds);
      const target = get().nodes[parentId];
      const requestedIds = getTopLevelSelectedIds(get().nodes, selectedIds);
      const selection = getBatchSelectionSummary(get().nodes, requestedIds);
      if (selection.hasSmartFolder) {
        return {
          success: [],
          failed: requestedIds.map(id => ({
            id,
            error: new Error('Smart folders do not support this operation'),
          })),
        };
      }
      const folder = await batchCreateFolderFromResources(get().namespaceId, {
        parentId,
        name: folderName,
        resourceIds: requestedIds,
      });
      const successIds = folder.success_ids.filter(id =>
        requestedIds.includes(id)
      );
      const failedIds = folder.failed_ids.filter(id =>
        requestedIds.includes(id)
      );

      set(s => {
        if (folder.id && folder.resource_type) {
          const parent = s.nodes[parentId];
          const spaceType =
            parent?.spaceType || folder.space_type || target?.spaceType;
          if (!spaceType) {
            return;
          }
          const node = createNode(folder as Resource, parentId, spaceType);
          s.nodes[node.id] = node;
          node.children = successIds.filter(id => Boolean(s.nodes[id]));
          node.hasChildren = node.children.length > 0;

          if (parent && !parent.children.includes(node.id)) {
            parent.children.unshift(node.id);
            parent.hasChildren = true;
            const parentUI = ensureUI(s, parentId);
            parentUI.expanded = true;
          }
          const folderUI = ensureUI(s, node.id);
          folderUI.expanded = true;
          folderUI.loaded = true;

          for (const id of node.children) {
            const child = s.nodes[id];
            if (!child) continue;
            const movedIds = [id, ...getDescendantIds(s.nodes, id)];
            const oldParentId = child.parentId;
            const oldParent = oldParentId ? s.nodes[oldParentId] : null;
            if (oldParent) {
              oldParent.children = oldParent.children.filter(cid => cid !== id);
              collapseEmptyNode(s, oldParentId);
            }
            child.parentId = node.id;
            traverseDescendants(s.nodes, id, descendant => {
              descendant.spaceType = spaceType;
            });
            for (const movedId of movedIds) {
              delete s.selectedIds[movedId];
            }
          }
        }
        finishBatchSelection(s);
      });

      return {
        success: successIds,
        failed: failedIds.map(id => ({
          id,
          error: new Error('Create folder failed'),
        })),
        resourceId: folder.id,
      };
    },

    addToChat: (ids: string[]) => {
      const nodes = get().nodes;
      const requestedIds = getTopLevelSelectedIds(nodes, ids);
      for (const id of requestedIds) {
        const node = nodes[id];
        if (!node) continue;
        addToChatContext(
          node,
          node.resourceType === 'folder' ||
            node.resourceType === 'smart_folder' ||
            node.hasChildren
            ? 'folder'
            : 'resource'
        );
      }
      return requestedIds;
    },
  };
}
