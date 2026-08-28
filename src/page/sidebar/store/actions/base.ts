import type { Resource, SpaceType } from '@/interface';
import { isSmartFolderChildResource } from '@/page/sidebar/components/smart-folder';
import type { ResourceSortOptions } from '@/service/resource';

import { parseResourceSorts, type ResourceSorts } from '../resourceSort';
import type { ManualDropIndicator, RootResource, SidebarSet } from '../types';
import { initialDialogsState } from '../types';
import {
  collapseEmptyNode,
  createNode,
  ensureUI,
  isManagedChildrenNode,
  patchNodeFromResource,
  traverseDescendants,
} from '../utils';

export function buildBaseActions(set: SidebarSet) {
  const storageKey = (namespaceId: string) =>
    `sidebar-resource-sort:${namespaceId}`;

  const resetTransientState = (s: Parameters<Parameters<typeof set>[0]>[0]) => {
    s.selectedIds = {};
    s.selectionMode = false;
    s.lastSelectedId = null;
    s.batchDragging = false;
  };

  return {
    setManualDropIndicator: (indicator: ManualDropIndicator | null) => {
      set(s => {
        if (
          s.manualDropIndicator?.targetId === indicator?.targetId &&
          s.manualDropIndicator?.position === indicator?.position &&
          s.manualDropIndicator?.line?.left === indicator?.line?.left &&
          s.manualDropIndicator?.line?.top === indicator?.line?.top &&
          s.manualDropIndicator?.line?.width === indicator?.line?.width &&
          s.manualDropIndicator?.line?.arrowOffset ===
            indicator?.line?.arrowOffset &&
          s.manualDropIndicator?.line?.guideOffset ===
            indicator?.line?.guideOffset
        ) {
          return;
        }
        s.manualDropIndicator = indicator;
      });
    },

    setResourceSort: (
      spaceType: SpaceType,
      resourceSort: ResourceSortOptions
    ) => {
      set(s => {
        s.resourceSorts[spaceType] = resourceSort;
        if (s.namespaceId) {
          localStorage.setItem(
            storageKey(s.namespaceId),
            JSON.stringify(s.resourceSorts)
          );
        }
      });
    },

    setResourceSorts: (resourceSorts: ResourceSorts) => {
      set(s => {
        s.resourceSorts = {
          private: { ...resourceSorts.private },
          teamspace: { ...resourceSorts.teamspace },
        };
        if (s.namespaceId) {
          localStorage.setItem(
            storageKey(s.namespaceId),
            JSON.stringify(s.resourceSorts)
          );
        }
      });
    },

    setNamespaceId: (id: string) => {
      set(s => {
        s.namespaceId = id;
        s.resourceSorts = parseResourceSorts(
          localStorage.getItem(storageKey(id))
        );
        s.nodes = {};
        s.ui = {};
        s.rootIds = { private: '', teamspace: '' };
        s.activeId = null;
        s.renamingId = null;
        s.manualDropIndicator = null;
        s.dialogs = { ...initialDialogsState };
        s.autoExpandedKeys = {};
        resetTransientState(s);
      });
    },

    init: (roots: Record<string, RootResource>) => {
      set(state => {
        state.nodes = {};

        for (const [spaceType, resource] of Object.entries(roots)) {
          const rootNode = createNode(resource, null, spaceType as SpaceType);
          state.ui[rootNode.id] = {
            expanded: true,
            loading: false,
            loaded: true,
          };

          state.nodes[rootNode.id] = rootNode;
          state.rootIds[spaceType as SpaceType] = rootNode.id;

          const children = resource.children || [];
          if (children.length > 0) {
            for (const child of children) {
              if (!(child.id in state.nodes)) {
                const parentId = child.parent_id || rootNode.id;
                const childNode = createNode(
                  child,
                  parentId,
                  spaceType as SpaceType
                );
                state.nodes[child.id] = childNode;
                state.ui[child.id] = {
                  expanded: false,
                  loading: false,
                  loaded: false,
                };
              }
            }

            for (const child of children) {
              const parentId = child.parent_id || rootNode.id;
              const parent = state.nodes[parentId];
              if (parent && !parent.children.includes(child.id)) {
                parent.children.push(child.id);
                parent.hasChildren = true;
              }
            }
          }
        }
      });
    },

    clear: () => {
      set(s => {
        s.nodes = {};
        s.ui = {};
        s.rootIds = { private: '', teamspace: '' };
        s.activeId = null;
        s.renamingId = null;
        s.manualDropIndicator = null;
        s.dialogs = { ...initialDialogsState };
        s.autoExpandedKeys = {};
        resetTransientState(s);
      });
    },

    patch: (
      id: string,
      updates: {
        name?: string;
        content?: string;
        hasChildren?: boolean;
        manualSortInitializedAt?: string | null;
      }
    ) => {
      set(s => {
        const node = s.nodes[id];
        if (!node) return;
        if (updates.name !== undefined) node.name = updates.name;
        if (updates.content !== undefined) node.content = updates.content;
        if (updates.hasChildren !== undefined) {
          node.hasChildren = isManagedChildrenNode(node) || updates.hasChildren;
        }
        if (updates.manualSortInitializedAt !== undefined) {
          node.manualSortInitializedAt = updates.manualSortInitializedAt;
        }
      });
    },

    setRenamingId: (id: string | null) => {
      set(s => {
        s.renamingId = id;
      });
    },

    refreshChildren: (parentId: string, resources: Resource[]) => {
      set(s => {
        const parent = s.nodes[parentId];
        if (!parent) return;
        const newIds = new Set(resources.map(r => (r as { id: string }).id));
        const deletedIds = new Set<string>();

        for (const cid of parent.children) {
          if (!newIds.has(cid) && s.nodes[cid]?.parentId === parentId) {
            const deleteRecursive = (id: string) => {
              const node = s.nodes[id];
              if (!node) return;
              deletedIds.add(id);
              for (const ccid of node.children) deleteRecursive(ccid);
              delete s.nodes[id];
            };
            deleteRecursive(cid);
          }
        }

        for (const res of resources) {
          if (!(res.id in s.nodes)) {
            s.nodes[res.id] = createNode(
              res,
              res.parent_id || parentId,
              parent.spaceType
            );
          } else {
            const n = s.nodes[res.id];
            if (n) {
              if (n.parentId !== parentId) {
                const oldParentId = n.parentId;
                const oldParent = oldParentId
                  ? s.nodes[oldParentId]
                  : undefined;
                if (oldParent) {
                  oldParent.children = oldParent.children.filter(
                    id => id !== res.id
                  );
                  collapseEmptyNode(s, oldParent.id);
                }
                n.parentId = parentId;
                traverseDescendants(s.nodes, n.id, node => {
                  node.spaceType = parent.spaceType;
                });
              }
              patchNodeFromResource(n, res);
            }
          }
        }

        parent.children = resources.map(r => (r as { id: string }).id);
        parent.hasChildren =
          isManagedChildrenNode(parent) || resources.length > 0;
        const pui = ensureUI(s, parentId);
        pui.loaded = true;
        pui.expanded = !isSmartFolderChildResource(parent);

        if (s.activeId && deletedIds.has(s.activeId)) {
          s.activeId = null;
        }
      });
    },
  };
}
