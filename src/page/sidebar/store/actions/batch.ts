import type { Resource, SpaceType } from '@/interface';
import { addToChatContext } from '@/lib/chat-bridge';
import {
  batchCreateFolderFromResources,
  batchDeleteResources,
  batchMoveResources,
  batchRefreshResources,
} from '@/service/resource';

import type {
  BatchOperationResult,
  SidebarGet,
  SidebarSet,
  SidebarStore,
} from '../types';
import {
  createNode,
  ensureUI,
  extractBatchResponseIds,
  getDescendantIds,
  getIdsInVisibleRange,
  getSelectableDescendantIds,
  getTopLevelSelectedIds,
  isDescendant,
  patchNodeFromResource,
  traverseDescendants,
} from '../utils';

export function buildBatchActions(set: SidebarSet, get: SidebarGet) {
  const markFailed = (failed: BatchOperationResult['failed']) => {
    set(s => {
      s.failedIds = {};
      for (const item of failed) {
        s.failedIds[item.id] = true;
      }
    });
  };

  const clearSelectionFor = (ids: string[]) => {
    set(s => {
      for (const id of ids) {
        delete s.selectedIds[id];
        delete s.failedIds[id];
      }
      s.selectionMode = Object.keys(s.selectedIds).length > 0;
      if (!s.selectionMode) {
        s.lastSelectedId = null;
      }
    });
  };

  return {
    toggleSelection: (id: string, rangeStartId?: string) => {
      set(s => {
        const targetIds = rangeStartId
          ? getIdsInVisibleRange(s, rangeStartId, id)
          : [id];

        for (const targetId of targetIds) {
          const expandedIds = getSelectableDescendantIds(s.nodes, targetId);
          const selected = Boolean(s.selectedIds[targetId]);

          for (const selectedId of expandedIds) {
            if (rangeStartId || !selected) {
              s.selectedIds[selectedId] = true;
              delete s.failedIds[selectedId];
            } else {
              delete s.selectedIds[selectedId];
              delete s.failedIds[selectedId];
            }
          }
        }

        s.lastSelectedId = id;
        s.selectionMode = Object.keys(s.selectedIds).length > 0;
      });
    },

    selectAll: (spaceType?: SpaceType) => {
      set(s => {
        const selectNode = (id: string) => {
          const node = s.nodes[id];
          if (!node) return;
          s.selectedIds[id] = true;
          delete s.failedIds[id];
          for (const childId of node.children) {
            selectNode(childId);
          }
        };

        const spaces = spaceType
          ? [spaceType]
          : (Object.keys(s.rootIds) as SpaceType[]);
        for (const type of spaces) {
          const root = s.nodes[s.rootIds[type]];
          if (!root) continue;
          for (const childId of root.children) {
            selectNode(childId);
          }
        }

        s.selectionMode = Object.keys(s.selectedIds).length > 0;
      });
    },

    deselectAll: () => {
      set(s => {
        s.selectedIds = {};
        s.selectionMode = false;
        s.lastSelectedId = null;
        s.failedIds = {};
      });
    },

    setSelectionMode: (enabled: boolean) => {
      set(s => {
        s.selectionMode = enabled;
        if (!enabled) {
          s.selectedIds = {};
          s.lastSelectedId = null;
          s.failedIds = {};
        }
      });
    },

    batchRemove: async (ids: string[]) => {
      const requestedIds = getTopLevelSelectedIds(get().nodes, ids);
      const result: BatchOperationResult = { success: [], failed: [] };

      try {
        const response = await batchDeleteResources(
          get().namespaceId,
          requestedIds
        );
        result.success = extractBatchResponseIds(requestedIds, response);
        result.failed = requestedIds
          .filter(id => !result.success.includes(id))
          .map(id => ({ id, error: new Error('Delete failed') }));
      } catch (error) {
        result.failed = requestedIds.map(id => ({
          id,
          error: error as Error,
        }));
      }

      set(s => {
        for (const id of result.success) {
          const node = s.nodes[id];
          const parentId = node?.parentId ?? null;
          const descendantIds = getDescendantIds(s.nodes, id);

          if (parentId) {
            const parent = s.nodes[parentId];
            if (parent) {
              parent.children = parent.children.filter(cid => cid !== id);
              parent.hasChildren = parent.children.length > 0;
            }
          }

          for (const removedId of [...descendantIds, id]) {
            delete s.nodes[removedId];
            delete s.ui[removedId];
            delete s.selectedIds[removedId];
            delete s.failedIds[removedId];
            if (s.activeId === removedId) {
              s.activeId = null;
            }
          }
        }

        for (const item of result.failed) {
          s.failedIds[item.id] = true;
        }
        s.selectionMode = Object.keys(s.selectedIds).length > 0;
      });

      return result;
    },

    batchMove: async (ids: string[], targetId: string) => {
      const requestedIds = getTopLevelSelectedIds(get().nodes, ids);
      const target = get().nodes[targetId];
      const result: BatchOperationResult = { success: [], failed: [] };

      if (!target) {
        return {
          success: [],
          failed: requestedIds.map(id => ({
            id,
            error: new Error('Target not found'),
          })),
        };
      }

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

      if (validIds.length > 0) {
        try {
          const response = await batchMoveResources(
            get().namespaceId,
            validIds,
            targetId
          );
          result.success = extractBatchResponseIds(validIds, response);
          result.failed.push(
            ...validIds
              .filter(id => !result.success.includes(id))
              .map(id => ({ id, error: new Error('Move failed') }))
          );
        } catch (error) {
          result.failed.push(
            ...validIds.map(id => ({ id, error: error as Error }))
          );
        }
      }

      set(s => {
        const newParent = s.nodes[targetId];
        if (!newParent) return;

        for (const id of result.success) {
          const node = s.nodes[id];
          if (!node) continue;
          const oldParentId = node.parentId;
          const movedIds = [id, ...getDescendantIds(s.nodes, id)];

          if (oldParentId) {
            const oldParent = s.nodes[oldParentId];
            if (oldParent) {
              oldParent.children = oldParent.children.filter(cid => cid !== id);
              oldParent.hasChildren = oldParent.children.length > 0;
            }
          }

          if (!newParent.children.includes(id)) {
            newParent.children.unshift(id);
          }
          newParent.hasChildren = true;
          const parentUI = ensureUI(s, targetId);
          parentUI.expanded = true;

          node.parentId = targetId;
          traverseDescendants(s.nodes, id, descendant => {
            descendant.spaceType = newParent.spaceType;
            const ui = s.ui[descendant.id];
            if (ui) ui.expanded = false;
          });

          for (const movedId of movedIds) {
            delete s.selectedIds[movedId];
            delete s.failedIds[movedId];
          }
        }

        for (const item of result.failed) {
          s.failedIds[item.id] = true;
        }
        s.selectionMode = Object.keys(s.selectedIds).length > 0;
      });

      return result;
    },

    batchRefresh: async (ids: string[]) => {
      const result: BatchOperationResult = { success: [], failed: [] };
      try {
        const response = await batchRefreshResources(get().namespaceId, ids);
        result.success = Object.keys(response).filter(id => ids.includes(id));
        result.failed = ids
          .filter(id => !result.success.includes(id))
          .map(id => ({ id, error: new Error('Refresh failed') }));

        set(s => {
          for (const [parentId, children] of Object.entries(
            response as Record<string, Resource[]>
          )) {
            refreshNodeChildren(s, parentId, children);
          }
        });
      } catch (error) {
        result.failed = ids.map(id => ({ id, error: error as Error }));
      }

      markFailed(result.failed);
      return result;
    },

    batchCreate: async (folderName: string, targetSpaceType: SpaceType) => {
      const selectedIds = Object.keys(get().selectedIds);
      const rootId = get().rootIds[targetSpaceType];
      const root = get().nodes[rootId];

      if (!root) {
        return {
          success: [],
          failed: selectedIds.map(id => ({
            id,
            error: new Error('Target root not found'),
          })),
        };
      }

      const requestedIds = getTopLevelSelectedIds(get().nodes, selectedIds);
      const folder = await batchCreateFolderFromResources(get().namespaceId, {
        parentId: rootId,
        name: folderName,
        resourceIds: requestedIds,
      });

      set(s => {
        const node = createNode(folder, rootId, targetSpaceType);
        s.nodes[node.id] = node;
        node.children = requestedIds.filter(id => Boolean(s.nodes[id]));
        node.hasChildren = node.children.length > 0;

        const draftRoot = s.nodes[rootId];
        if (draftRoot) {
          draftRoot.children.unshift(node.id);
          draftRoot.hasChildren = true;
        }
        const rootUI = ensureUI(s, rootId);
        rootUI.expanded = true;
        const folderUI = ensureUI(s, node.id);
        folderUI.expanded = true;
        folderUI.loaded = true;

        for (const id of node.children) {
          const child = s.nodes[id];
          if (!child) continue;
          const oldParent = child.parentId ? s.nodes[child.parentId] : null;
          if (oldParent) {
            oldParent.children = oldParent.children.filter(cid => cid !== id);
            oldParent.hasChildren = oldParent.children.length > 0;
          }
          child.parentId = node.id;
          const movedIds = [id, ...getDescendantIds(s.nodes, id)];
          traverseDescendants(s.nodes, id, descendant => {
            descendant.spaceType = targetSpaceType;
          });
          for (const movedId of movedIds) {
            delete s.selectedIds[movedId];
            delete s.failedIds[movedId];
          }
        }
        s.selectionMode = Object.keys(s.selectedIds).length > 0;
      });

      return { success: requestedIds, failed: [] };
    },

    addToChat: (ids: string[]) => {
      const nodes = get().nodes;
      for (const id of ids) {
        const node = nodes[id];
        if (!node) continue;
        addToChatContext(
          node,
          node.resourceType === 'folder' ? 'folder' : 'resource'
        );
      }
      clearSelectionFor(ids);
    },
  };
}

function refreshNodeChildren(
  state: SidebarStore,
  parentId: string,
  children: Resource[]
) {
  const parent = state.nodes[parentId];
  if (!parent) return;

  const childIds = children.map(child => child.id);
  const backendIds = new Set(childIds);

  for (const currentChildId of parent.children) {
    if (backendIds.has(currentChildId)) continue;
    for (const removedId of [
      ...getDescendantIds(state.nodes, currentChildId),
      currentChildId,
    ]) {
      delete state.nodes[removedId];
      delete state.ui[removedId];
      delete state.selectedIds[removedId];
      delete state.failedIds[removedId];
      if (state.activeId === removedId) {
        state.activeId = null;
      }
    }
  }

  for (const child of children) {
    if (!state.nodes[child.id]) {
      state.nodes[child.id] = createNode(child, parentId, parent.spaceType);
    } else {
      patchNodeFromResource(state.nodes[child.id], child);
      state.nodes[child.id].parentId = parentId;
      state.nodes[child.id].spaceType = parent.spaceType;
    }
  }

  parent.children = childIds;
  parent.hasChildren = childIds.length > 0;
  const ui = ensureUI(state, parentId);
  ui.loaded = true;
}
