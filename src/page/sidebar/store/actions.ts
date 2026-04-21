import { ResourceType, SpaceType } from '@/interface';

import { sidebarApi } from './sidebar-api';
import { RootResource, SidebarActions, SidebarGet, SidebarSet } from './types';
import {
  collectParentIds,
  createNode,
  detectSpaceType,
  findNextActiveId,
  getDescendantIds,
  isDescendant,
} from './utils';

export function buildActions(set: SidebarSet, get: SidebarGet): SidebarActions {
  // In-flight expand promise cache to prevent concurrent requests
  const expandPromises = new Map<string, Promise<void>>();

  // Simple throttle for upload progress (100ms)
  let lastProgressTime = 0;

  return {
    // ─── Namespace ───
    setNamespaceId: id => {
      set(s => {
        s.namespaceId = id;
      });
    },

    // ─── Init ───
    init: (roots: Record<string, RootResource>) => {
      set(state => {
        state.nodes = {};
        for (const [spaceType, resource] of Object.entries(roots)) {
          const rootNode = createNode(resource, null, spaceType as SpaceType);
          rootNode.expanded = true;
          rootNode.loaded = true;

          state.nodes[rootNode.id] = rootNode;
          state.rootIds[spaceType as SpaceType] = rootNode.id;

          // Process initial children from /root API response
          const children = resource.children || [];
          if (children.length > 0) {
            // First pass: create all child nodes
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
              }
            }

            // Second pass: build children arrays
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

    // ─── Expand ───
    expand: async id => {
      if (expandPromises.has(id)) return expandPromises.get(id)!;

      const node = get().nodes[id];
      if (!node || node.loading) return;

      const promise = (async () => {
        set(s => {
          const n = s.nodes[id];
          if (n) n.loading = true;
        });

        try {
          const children = await sidebarApi.fetchChildren(
            get().namespaceId,
            id
          );

          set(s => {
            const n = s.nodes[id];
            if (!n) return;
            n.loading = false;
            n.loaded = true;
            n.expanded = true;

            const backendIds = new Set(children.map(c => c.id));
            const preserved = n.children.filter(
              cid => !backendIds.has(cid) && cid in s.nodes
            );
            n.children = [...children.map(c => c.id), ...preserved];

            for (const child of children) {
              if (!(child.id in s.nodes)) {
                s.nodes[child.id] = createNode(child, id, n.spaceType);
              } else {
                const existing = s.nodes[child.id];
                if (existing) {
                  existing.name = child.name || '';
                  existing.hasChildren = child.has_children ?? false;
                  existing.updatedAt = child.updated_at || '';
                  existing.resourceType = child.resource_type;
                }
              }
            }
          });
        } catch (err) {
          console.error('[sidebar] expand failed:', err);
          set(s => {
            const n = s.nodes[id];
            if (n) n.loading = false;
          });
        } finally {
          expandPromises.delete(id);
        }
      })();

      expandPromises.set(id, promise);
      return promise;
    },

    // ─── Collapse ───
    collapse: id => {
      set(s => {
        const node = s.nodes[id];
        if (node) node.expanded = false;
      });
    },

    // ─── Toggle Space ───
    toggleSpace: (spaceType, open) => {
      set(s => {
        s.spaceExpanded[spaceType] = open ?? !s.spaceExpanded[spaceType];
      });
    },

    // ─── Create ───
    create: async (parentId, type, name) => {
      const parent = get().nodes[parentId];
      if (!parent) throw new Error('Parent not found');

      const payload: {
        parentId: string;
        resourceType: ResourceType;
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
          p.expanded = true;
        }
      });

      return response.id;
    },

    // ─── Remove ───
    remove: (id, currentResourceId) => {
      const node = get().nodes[id];
      if (!node) return { nextId: null, navigateToChat: false };

      const parentId = node.parentId;
      const nextId = findNextActiveId(get().nodes, id);
      const descendantIds = getDescendantIds(get().nodes, id);
      const targetId = currentResourceId ?? get().activeId;

      set(s => {
        // Remove from parent's children
        if (parentId) {
          const parent = s.nodes[parentId];
          if (parent) {
            parent.children = parent.children.filter(cid => cid !== id);
            parent.hasChildren = parent.children.length > 0;
          }
        }

        // Recursively delete descendants
        for (const did of [...descendantIds, id]) {
          delete s.nodes[did];
        }

        // Clear editingId if deleted
        if (
          s.editingId === id ||
          (s.editingId && descendantIds.includes(s.editingId))
        ) {
          s.editingId = null;
        }

        // Update activeId if the deleted node (or its descendant) was active
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

    // ─── Rename ───
    rename: async (id, name) => {
      await sidebarApi.rename(get().namespaceId, id, name);

      set(s => {
        const node = s.nodes[id];
        if (node) node.name = name;
      });
    },

    // ─── Move ───
    move: (dragId, dropId) => {
      const drag = get().nodes[dragId];
      const drop = get().nodes[dropId];
      if (!drag || !drop) return;

      // Prevent moving a node into its own descendant (cycle)
      if (isDescendant(get().nodes, dragId, dropId)) return;

      const oldParentId = drag.parentId;

      set(s => {
        // Remove from old parent
        if (oldParentId) {
          const oldParent = s.nodes[oldParentId];
          if (oldParent) {
            oldParent.children = oldParent.children.filter(
              cid => cid !== dragId
            );
            oldParent.hasChildren = oldParent.children.length > 0;
          }
        }

        // Collapse the moved resource and its descendants
        const collapseRecursive = (nid: string) => {
          const n = s.nodes[nid];
          if (!n) return;
          n.expanded = false;
          for (const cid of n.children) collapseRecursive(cid);
        };
        collapseRecursive(dragId);

        // Add to new parent
        const newParent = s.nodes[dropId];
        if (!newParent) return;
        newParent.hasChildren = true;
        newParent.children.unshift(dragId);

        const draftDrag = s.nodes[dragId];
        if (!draftDrag) return;
        draftDrag.parentId = dropId;
        draftDrag.spaceType = newParent.spaceType;

        // Update all descendants' spaceType
        const updateDescendants = (nid: string) => {
          const n = s.nodes[nid];
          if (!n) return;
          n.spaceType = newParent.spaceType;
          for (const cid of n.children) updateDescendants(cid);
        };
        updateDescendants(dragId);
      });
    },

    // ─── Upload ───
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
            if (now - lastProgressTime < 100) return;
            lastProgressTime = now;
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
              p.expanded = true;
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

    // ─── Activate ───
    activate: id => {
      set(s => {
        s.activeId = id;
      });
    },

    // ─── Set Editing Id ───
    setEditingId: id => {
      set(s => {
        s.editingId = id;
      });
    },

    // ─── Expand Path To ───
    expandPathTo: async targetId => {
      const nodes = get().nodes;
      const target = nodes[targetId];

      if (target) {
        const parentIds = collectParentIds(nodes, targetId);
        await Promise.all(
          parentIds.map(async pid => {
            if (!nodes[pid]?.expanded) {
              await get().expand(pid);
            }
          })
        );
        return;
      }

      // Target not loaded yet - fetch from API
      try {
        const resource = await sidebarApi.fetchResource(
          get().namespaceId,
          targetId
        );
        if (!resource?.path?.length) return;

        const spaceType =
          resource.space_type ||
          detectSpaceType(nodes, get().rootIds, resource.path[0].id);
        if (!spaceType) return;

        // Collect missing node ids along the path
        const missingIds: string[] = [];
        for (const item of resource.path) {
          if (!(item.id in nodes)) missingIds.push(item.id);
        }
        if (!(targetId in nodes) && !missingIds.includes(targetId)) {
          missingIds.push(targetId);
        }

        // Fetch missing nodes
        if (missingIds.length > 0) {
          const missingResources = await sidebarApi.fetchResourcesByIds(
            get().namespaceId,
            missingIds
          );

          set(s => {
            for (const res of missingResources) {
              if (!(res.id in s.nodes)) {
                const parentId = res.parent_id || s.rootIds[spaceType];
                s.nodes[res.id] = createNode(res, parentId, spaceType);
              }
            }
          });
        }

        // Build parent-child relationships and expand
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

          // Expand all parents
          const parentIds = collectParentIds(s.nodes, targetId);
          for (const pid of parentIds) {
            const n = s.nodes[pid];
            if (n) n.expanded = true;
          }
        });

        // Load children for each parent in the path that hasn't been loaded
        const parentIds = collectParentIds(get().nodes, targetId);
        await Promise.all(
          [...parentIds, targetId].map(async pid => {
            const n = get().nodes[pid];
            if (n && !n.loaded && n.hasChildren) {
              await get().expand(pid);
            }
          })
        );
      } catch (err) {
        console.error('[sidebar] expandPathTo failed:', err);
      }
    },

    // ─── Patch ───
    patch: (id, updates) => {
      set(s => {
        const node = s.nodes[id];
        if (!node) return;
        if (updates.name !== undefined) node.name = updates.name;
        if (updates.content !== undefined) node.content = updates.content;
      });
    },

    // ─── Refresh Children ───
    refreshChildren: (parentId, resources) => {
      set(s => {
        const parent = s.nodes[parentId];
        if (!parent) return;

        const newIds = new Set(resources.map(r => r.id));
        const deletedIds = new Set<string>();

        // Remove children that no longer exist (and their descendants)
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

        // Upsert new children
        for (const res of resources) {
          if (!(res.id in s.nodes)) {
            s.nodes[res.id] = createNode(res, parentId, parent.spaceType);
          } else {
            const n = s.nodes[res.id];
            if (n) {
              n.name = res.name || '';
              n.hasChildren = res.has_children ?? false;
              n.updatedAt = res.updated_at || '';
              n.resourceType = res.resource_type;
            }
          }
        }

        parent.children = resources.map(r => r.id);
        parent.loaded = true;

        // Clean up activeId/editingId if they were deleted
        if (s.activeId && deletedIds.has(s.activeId)) {
          s.activeId = null;
        }
        if (s.editingId && deletedIds.has(s.editingId)) {
          s.editingId = null;
        }
      });
    },

    // ─── Restore ───
    restore: resource => {
      const spaceType =
        resource.space_type ||
        detectSpaceType(get().nodes, get().rootIds, resource.path?.[0]?.id) ||
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
          parent.expanded = true;
        }
      });

      return resource.id;
    },

    // ─── Clear ───
    clear: () => {
      set(s => {
        s.nodes = {};
        s.rootIds = { private: '', teamspace: '' };
        s.activeId = null;
        s.editingId = null;
        s.uploading = {};
        s.uploadProgress = {};
      });
    },
  };
}
