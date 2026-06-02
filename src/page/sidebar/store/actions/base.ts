import type { Resource, SpaceType } from '@/interface';

import type { RootResource, SidebarSet } from '../types';
import { initialDialogsState } from '../types';
import { createNode, ensureUI, patchNodeFromResource } from '../utils';

export function buildBaseActions(set: SidebarSet) {
  const resetTransientState = (s: Parameters<Parameters<typeof set>[0]>[0]) => {
    s.selectedIds = {};
    s.selectionMode = false;
    s.lastSelectedId = null;
    s.batchDragging = false;
  };

  return {
    setNamespaceId: (id: string) => {
      set(s => {
        s.namespaceId = id;
        s.nodes = {};
        s.ui = {};
        s.rootIds = { private: '', teamspace: '' };
        s.activeId = null;
        s.renamingId = null;
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
        s.dialogs = { ...initialDialogsState };
        s.autoExpandedKeys = {};
        resetTransientState(s);
      });
    },

    patch: (
      id: string,
      updates: { name?: string; content?: string; hasChildren?: boolean }
    ) => {
      set(s => {
        const node = s.nodes[id];
        if (!node) return;
        if (updates.name !== undefined) node.name = updates.name;
        if (updates.content !== undefined) node.content = updates.content;
        if (updates.hasChildren !== undefined) {
          node.hasChildren = updates.hasChildren;
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
          if (!newIds.has(cid)) {
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
              patchNodeFromResource(n, res);
            }
          }
        }

        parent.children = resources.map(r => (r as { id: string }).id);
        parent.hasChildren = resources.length > 0;
        const pui = ensureUI(s, parentId);
        pui.loaded = true;
        pui.expanded = true;

        if (s.activeId && deletedIds.has(s.activeId)) {
          s.activeId = null;
        }
      });
    },
  };
}
