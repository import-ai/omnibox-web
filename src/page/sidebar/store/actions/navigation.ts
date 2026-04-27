import type { SpaceType } from '@/interface';
import {
  fetchChildren,
  fetchResource,
  fetchResourcesByIds,
} from '@/service/resource';

import type { SidebarGet, SidebarSet } from '../types';
import {
  collectParentIds,
  createNode,
  detectSpaceType,
  ensureUI,
  patchNodeFromResource,
} from '../utils';

export function buildNavigationActions(set: SidebarSet, get: SidebarGet) {
  const expandPromises = new Map<string, Promise<void>>();

  return {
    activate: (id: string) => {
      set(s => {
        s.activeId = id;
      });
    },

    expand: async (id: string) => {
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
          const children = await fetchChildren(get().namespaceId, id);

          set(s => {
            const ui = ensureUI(s, id);
            ui.loading = false;
            ui.loaded = true;
            ui.expanded = true;

            const n = s.nodes[id];
            const backendIds = new Set(
              children.map((c: { id: string }) => c.id)
            );
            const preserved = n.children.filter(
              (cid: string) => !backendIds.has(cid) && cid in s.nodes
            );
            n.children = [
              ...children.map((c: { id: string }) => c.id),
              ...preserved,
            ];

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

            // 记录此资源已展开，避免重复展开
            s.autoExpandedKeys[`${s.namespaceId}:${id}`] = true;
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

    collapse: (id: string) => {
      set(s => {
        const ui = s.ui[id];
        if (ui) ui.expanded = false;
      });
    },

    toggleSpace: (spaceType: SpaceType, open?: boolean) => {
      set(s => {
        s.spaceExpanded[spaceType] = open ?? !s.spaceExpanded[spaceType];
      });
    },

    expandPathTo: async (
      targetId: string,
      options?: { expandTarget?: boolean }
    ) => {
      const namespaceId = get().namespaceId;
      const autoExpandKey = `${namespaceId}:${targetId}`;

      const nodes = get().nodes;
      const target = nodes[targetId];

      // 如果节点已在树中且已展开，跳过展开
      if (
        target &&
        get().ui[targetId]?.expanded &&
        get().autoExpandedKeys[autoExpandKey]
      ) {
        return;
      }

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
        const resource = await fetchResource(get().namespaceId, targetId);
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
          const missingResources = await fetchResourcesByIds(
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

        // 记录此资源已展开，避免重复展开
        set(s => {
          s.autoExpandedKeys[autoExpandKey] = true;
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
  };
}
