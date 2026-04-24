import type { RootResource, SidebarGet, SidebarSet } from '../types';
import { createNode, ensureUI, patchNodeFromResource } from '../utils';

export function buildBaseActions(set: SidebarSet, _get: SidebarGet) {
  return {
    setNamespaceId: (id: string) => {
      set(s => {
        s.namespaceId = id;
        s.nodes = {};
        s.ui = {};
        s.rootIds = { private: '', teamspace: '' };
        s.activeId = null;
      });
    },

    init: (roots: Record<string, RootResource>) => {
      set(state => {
        state.nodes = {};

        for (const [spaceType, resource] of Object.entries(roots)) {
          const rootNode = createNode(
            resource,
            null,
            spaceType as 'private' | 'teamspace'
          );
          state.ui[rootNode.id] = {
            expanded: true,
            loading: false,
            loaded: true,
          };

          state.nodes[rootNode.id] = rootNode;
          state.rootIds[spaceType as 'private' | 'teamspace'] = rootNode.id;

          const children = resource.children || [];
          if (children.length > 0) {
            for (const child of children) {
              if (!(child.id in state.nodes)) {
                const parentId = child.parent_id || rootNode.id;
                const childNode = createNode(
                  child,
                  parentId,
                  spaceType as 'private' | 'teamspace'
                );
                childNode.hasChildren = child.has_children ?? false;
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
        s.upload = {};
      });
    },

    patch: (id: string, updates: { name?: string; content?: string }) => {
      set(s => {
        const node = s.nodes[id];
        if (!node) return;
        if (updates.name !== undefined) node.name = updates.name;
        if (updates.content !== undefined) node.content = updates.content;
      });
    },

    refreshChildren: (parentId: string, resources: unknown[]) => {
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
          const r = res as { id: string; parent_id?: string };
          if (!(r.id in s.nodes)) {
            s.nodes[r.id] = createNode(
              r,
              r.parent_id || parentId,
              parent.spaceType
            );
          } else {
            const n = s.nodes[r.id];
            if (n) {
              patchNodeFromResource(n, r);
            }
          }
        }

        parent.children = resources.map(r => (r as { id: string }).id);
        const pui = ensureUI(s, parentId);
        pui.loaded = true;

        if (s.activeId && deletedIds.has(s.activeId)) {
          s.activeId = null;
        }
      });
    },
  };
}
