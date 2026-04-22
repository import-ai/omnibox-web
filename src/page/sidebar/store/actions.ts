import { Resource, SpaceType } from '@/interface';

import { sidebarApi } from './api';
import type {
  NodeUI,
  SidebarActions,
  SidebarGet,
  SidebarSet,
  SidebarState,
} from './types';
import {
  collectParentIds,
  createNode,
  detectSpaceType,
  findNextActiveId,
  getDescendantIds,
  isDescendant,
  patchNodeFromResource,
  traverseDescendants,
} from './utils';

function ensureUI(s: SidebarState, id: string): NodeUI {
  if (!s.ui[id]) {
    s.ui[id] = { expanded: false, loading: false, loaded: false };
  }
  return s.ui[id];
}

export function buildActions(set: SidebarSet, get: SidebarGet): SidebarActions {
  const expandPromises = new Map<string, Promise<void>>();
  const lastProgressTimes = new Map<string, number>();

  return {
    setNamespaceId: id => {
      set(s => {
        s.namespaceId = id;
      });
    },

    init: (roots: Record<string, import('./types').RootResource>) => {
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

    expand: async id => {
      if (expandPromises.has(id)) return expandPromises.get(id)!;

      const node = get().nodes[id];
      const nodeUI = get().ui[id];
      if (!node || nodeUI?.loading) return;

      const promise = (async () => {
        set(s => {
          const ui = ensureUI(s, id);
          ui.loading = true;
        });

        try {
          const children = await sidebarApi.fetchChildren(
            get().namespaceId,
            id
          );

          set(s => {
            const ui = ensureUI(s, id);
            ui.loading = false;
            ui.loaded = true;
            ui.expanded = true;

            const n = s.nodes[id];
            const backendIds = new Set(children.map((c: Resource) => c.id));
            const preserved = n.children.filter(
              (cid: string) => !backendIds.has(cid) && cid in s.nodes
            );
            n.children = [...children.map((c: Resource) => c.id), ...preserved];

            for (const child of children) {
              if (!(child.id in s.nodes)) {
                s.nodes[child.id] = createNode(child, id, n.spaceType);
              } else {
                const existing = s.nodes[child.id];
                if (existing) {
                  patchNodeFromResource(existing, child);
                }
              }
            }
          });
        } catch (err) {
          console.error('[sidebar] expand failed:', err);
          set(s => {
            const ui = s.ui[id];
            if (ui) ui.loading = false;
          });
        } finally {
          expandPromises.delete(id);
        }
      })();

      expandPromises.set(id, promise);
      return promise;
    },

    collapse: id => {
      set(s => {
        const ui = s.ui[id];
        if (ui) ui.expanded = false;
      });
    },

    toggleSpace: (spaceType, open) => {
      set(s => {
        s.spaceExpanded[spaceType] = open ?? !s.spaceExpanded[spaceType];
      });
    },

    create: async (parentId, type, name) => {
      const parent = get().nodes[parentId];
      if (!parent) throw new Error('Parent not found');

      const payload: {
        parentId: string;
        resourceType: import('@/interface').ResourceType;
        name?: string;
      } = {
        parentId,
        resourceType: type,
      };
      if (name?.trim()) payload.name = name.trim();

      const response = await sidebarApi.create(get().namespaceId, payload);

      set(s => {
        const node = createNode(response, parentId, parent.spaceType);
        s.nodes[node.id] = node;

        const p = s.nodes[parentId];
        if (p) {
          p.children.unshift(node.id);
          p.hasChildren = true;
          const pui = ensureUI(s, parentId!);
          pui.expanded = true;
        }
      });

      return response.id;
    },

    remove: (id, currentResourceId) => {
      const node = get().nodes[id];
      if (!node) return { nextId: null, navigateToChat: false };

      const parentId = node.parentId;
      const nextId = findNextActiveId(get().nodes, id);
      const descendantIds = getDescendantIds(get().nodes, id);
      const targetId = currentResourceId ?? get().activeId;

      set(s => {
        if (parentId) {
          const parent = s.nodes[parentId];
          if (parent) {
            parent.children = parent.children.filter(cid => cid !== id);
            parent.hasChildren = parent.children.length > 0;
          }
        }

        for (const did of [...descendantIds, id]) {
          delete s.nodes[did];
        }

        if (targetId === id || (targetId && descendantIds.includes(targetId))) {
          s.activeId = nextId;
        }
      });

      if (targetId === id || (targetId && descendantIds.includes(targetId))) {
        if (nextId) {
          return { nextId, navigateToChat: false };
        }
        return { nextId: null, navigateToChat: true };
      }
      return { nextId: null, navigateToChat: false };
    },

    rename: async (id, name) => {
      await sidebarApi.rename(get().namespaceId, id, name);

      set(s => {
        const node = s.nodes[id];
        if (node) node.name = name;
      });
    },

    move: async (dragId, dropId) => {
      await sidebarApi.move(get().namespaceId, dragId, dropId);

      const drag = get().nodes[dragId];
      const drop = get().nodes[dropId];
      if (!drag || !drop) return;

      if (isDescendant(get().nodes, dragId, dropId)) return;

      const oldParentId = drag.parentId;

      set(s => {
        if (oldParentId) {
          const oldParent = s.nodes[oldParentId];
          if (oldParent) {
            oldParent.children = oldParent.children.filter(
              cid => cid !== dragId
            );
            oldParent.hasChildren = oldParent.children.length > 0;
          }
        }

        const newParent = s.nodes[dropId];
        if (!newParent) return;
        newParent.hasChildren = true;
        newParent.children.unshift(dragId);

        const draftDrag = s.nodes[dragId];
        if (!draftDrag) return;
        draftDrag.parentId = dropId;
        draftDrag.spaceType = newParent.spaceType;

        traverseDescendants(s.nodes, dragId, n => {
          const ui = s.ui[n.id];
          if (ui) ui.expanded = false;
        });

        traverseDescendants(s.nodes, dragId, n => {
          n.spaceType = newParent.spaceType;
        });
      });
    },

    upload: async (parentId, files) => {
      const parent = get().nodes[parentId];
      if (!parent) throw new Error('Parent not found');

      set(s => {
        s.uploading[parentId] = true;
      });

      try {
        const response = await sidebarApi.upload(files, {
          parentId,
          namespaceId: get().namespaceId,
          onProgress: ({ done, total }) => {
            const now = Date.now();
            const last = lastProgressTimes.get(parentId) || 0;
            if (now - last < 100) return;
            lastProgressTimes.set(parentId, now);
            set(s => {
              s.uploadProgress[parentId] = `${done}/${total}`;
            });
          },
        });

        const resources = Array.isArray(response) ? response : [response];

        set(s => {
          for (const res of resources) {
            const node = createNode(res, parentId, parent.spaceType);
            s.nodes[node.id] = node;
            const p = s.nodes[parentId];
            if (p) {
              p.children.unshift(node.id);
              p.hasChildren = true;
              ensureUI(s, parentId).expanded = true;
            }
          }
        });

        const last = resources[resources.length - 1];
        return last.id;
      } finally {
        set(s => {
          delete s.uploading[parentId];
          delete s.uploadProgress[parentId];
        });
      }
    },

    activate: id => {
      set(s => {
        s.activeId = id;
      });
    },

    expandPathTo: async (targetId, options) => {
      const nodes = get().nodes;
      const target = nodes[targetId];

      if (target) {
        const parentIds = collectParentIds(nodes, targetId);
        await Promise.all(
          parentIds.map(async pid => {
            if (!get().ui[pid]?.expanded) {
              await get().expand(pid);
            }
          })
        );
        if (
          options?.expandTarget &&
          target.hasChildren &&
          !get().ui[targetId]?.expanded
        ) {
          await get().expand(targetId);
        }
        return;
      }

      try {
        const resource = await sidebarApi.fetchResource(
          get().namespaceId,
          targetId
        );
        if (!resource?.path?.length) return;

        const spaceType =
          (resource.space_type as SpaceType | undefined) ||
          detectSpaceType(nodes, get().rootIds, resource.path[0].id);
        if (!spaceType) return;

        const missingIds: string[] = [];
        for (const item of resource.path) {
          if (!(item.id in nodes)) missingIds.push(item.id);
        }
        if (!(targetId in nodes) && !missingIds.includes(targetId)) {
          missingIds.push(targetId);
        }

        if (missingIds.length > 0) {
          const missingResources = await sidebarApi.fetchResourcesByIds(
            get().namespaceId,
            missingIds
          );

          set(s => {
            for (const res of missingResources) {
              if (!(res.id in s.nodes)) {
                const parentId =
                  res.parent_id || s.rootIds[spaceType as SpaceType];
                s.nodes[res.id] = createNode(res, parentId, spaceType);
              }
            }
          });
        }

        set(s => {
          for (let i = 0; i < resource.path.length - 1; i++) {
            const parent = s.nodes[resource.path[i].id];
            const child = s.nodes[resource.path[i + 1].id];
            if (parent && child && !parent.children.includes(child.id)) {
              parent.children.push(child.id);
              child.parentId = parent.id;
            }
          }
          const targetNode = s.nodes[targetId];
          const lastPathItem = resource.path[resource.path.length - 1];
          if (targetNode && lastPathItem && targetNode.id !== lastPathItem.id) {
            const lastParent = s.nodes[lastPathItem.id];
            if (lastParent && !lastParent.children.includes(targetId)) {
              lastParent.children.push(targetId);
              targetNode.parentId = lastParent.id;
            }
          }

          const parentIds = collectParentIds(s.nodes, targetId);
          for (const pid of parentIds) {
            const ui = ensureUI(s, pid);
            ui.expanded = true;
          }
        });

        const parentIds = collectParentIds(get().nodes, targetId);
        await Promise.all(
          [...parentIds, targetId].map(async pid => {
            const ui = get().ui[pid];
            const n = get().nodes[pid];
            if (n && ui && !ui.loaded && n.hasChildren) {
              await get().expand(pid);
            }
          })
        );
      } catch (err) {
        console.error('[sidebar] expandPathTo failed:', err);
      }
    },

    patch: (id, updates) => {
      set(s => {
        const node = s.nodes[id];
        if (!node) return;
        if (updates.name !== undefined) node.name = updates.name;
        if (updates.content !== undefined) node.content = updates.content;
      });
    },

    refreshChildren: (parentId, resources) => {
      set(s => {
        const parent = s.nodes[parentId];
        if (!parent) return;

        const newIds = new Set(resources.map(r => r.id));
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
            s.nodes[res.id] = createNode(res, parentId, parent.spaceType);
          } else {
            const n = s.nodes[res.id];
            if (n) {
              patchNodeFromResource(n, res);
            }
          }
        }

        parent.children = resources.map(r => r.id);
        const pui = ensureUI(s, parentId);
        pui.loaded = true;

        if (s.activeId && deletedIds.has(s.activeId)) {
          s.activeId = null;
        }
      });
    },

    restore: async resourceOrId => {
      const resource: Resource =
        typeof resourceOrId === 'string'
          ? await sidebarApi.restore(get().namespaceId, resourceOrId)
          : resourceOrId;

      const spaceType =
        resource.space_type ||
        detectSpaceType(
          get().nodes,
          get().rootIds,
          resource.path?.[0]?.id ?? ''
        ) ||
        'private';

      set(s => {
        s.spaceExpanded[spaceType] = true;

        const parentId = resource.parent_id || null;
        const node = createNode(resource, parentId, spaceType);
        if (!(node.id in s.nodes)) {
          s.nodes[node.id] = node;
        }

        const parent = parentId ? s.nodes[parentId] : null;
        if (parent && !parent.children.includes(node.id)) {
          parent.children.unshift(node.id);
          parent.hasChildren = true;
          if (parentId) {
            const pui = ensureUI(s, parentId);
            pui.expanded = true;
          }
        }
      });

      get().activate(resource.id);
      return resource.id;
    },

    clear: () => {
      set(s => {
        s.nodes = {};
        s.ui = {};
        s.rootIds = { private: '', teamspace: '' };
        s.activeId = null;
        s.uploading = {};
        s.uploadProgress = {};
      });
    },
  };
}
