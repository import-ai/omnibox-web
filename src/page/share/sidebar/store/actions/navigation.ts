import type { Resource } from '@/interface';
import { fetchShareChildren, fetchShareResource } from '@/service/share';

import type { SidebarGet, SidebarSet, SpaceType, TreeNode } from '../types';
import {
  collectParentIds,
  createNode,
  detectSpaceType,
  ensureUI,
  patchNodeFromResource,
} from '../utils';

export function buildNavigationActions(set: SidebarSet, get: SidebarGet) {
  const expandPromises = new Map<string, Promise<void>>();

  const normalizeShareChildren = (
    parent: TreeNode,
    children: Resource[]
  ): Resource[] => {
    if (parent.resourceType !== 'smart_folder') {
      return children;
    }

    return children.map(child => ({
      ...child,
      parent_id: parent.id,
      has_children: false,
      attrs: {
        ...(child.attrs || {}),
        __smart_folder_child: true,
        __source_resource_id: child.id,
        __source_parent_id: child.parent_id,
      },
    }));
  };

  const patchNodeFromSharedResource = (node: TreeNode, resource: Resource) => {
    const previousHasChildren = node.hasChildren;
    patchNodeFromResource(node, resource);
    if (resource.has_children === undefined) {
      node.hasChildren = previousHasChildren;
    }
  };

  const fetchPathResources = async (
    shareId: string,
    path: Array<{ id: string }>,
    target: Resource
  ): Promise<Resource[]> => {
    const resources: Resource[] = [];

    for (const item of path) {
      if (item.id === target.id) {
        resources.push(target);
      } else {
        resources.push(await fetchShareResource(shareId, item.id));
      }
    }

    return resources;
  };

  return {
    activate: (id: string | null) => {
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
          const children = normalizeShareChildren(
            node,
            await fetchShareChildren(get().namespaceId, id)
          );

          set(s => {
            const ui = ensureUI(s, id);
            ui.loading = false;
            ui.loaded = true;
            ui.expanded = true;

            const n = s.nodes[id];
            n.hasChildren = children.length > 0;
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
              if (child.attrs?.__smart_folder_child === true) {
                const childNode = s.nodes[child.id];
                if (childNode) {
                  childNode.parentId = id;
                  childNode.children = [];
                  childNode.hasChildren = false;
                }
                const childUI = ensureUI(s, child.id);
                childUI.expanded = false;
                childUI.loaded = false;
                childUI.loading = false;
              }
              ensureUI(s, child.id);
            }

            s.autoExpandedKeys[`${s.namespaceId}:${id}`] = true;
          });
        } catch (err) {
          const status = (err as { response?: { status?: number } }).response
            ?.status;
          if (status !== 404) {
            console.error('[sidebar] expand failed:', err);
          }
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

    expandAllFrom: async (id: string) => {
      const visited = new Set<string>();

      const expandRecursive = async (nodeId: string): Promise<void> => {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);

        const node = get().nodes[nodeId];
        if (!node?.hasChildren) return;

        const ui = get().ui[nodeId];
        if (!ui?.loaded || !ui.expanded) {
          await get().expand(nodeId);
        }

        const latest = get().nodes[nodeId];
        await Promise.all(
          (latest?.children ?? []).map(childId => expandRecursive(childId))
        );
      };

      await expandRecursive(id);
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
          !get().ui[targetId]?.expanded &&
          !get().ui[targetId]?.loaded
        ) {
          await get().expand(targetId);
        }
        return;
      }

      try {
        const resource = await fetchShareResource(get().namespaceId, targetId);
        if (!resource?.path?.length) return;

        const spaceType =
          detectSpaceType(nodes, get().rootIds, resource.path[0].id) ??
          ('share' satisfies SpaceType);
        if (!spaceType) return;

        const fullPath = resource.path.some(
          (item: { id: string }) => item.id === targetId
        )
          ? resource.path
          : [...resource.path, { id: targetId, name: resource.name || '' }];
        const pathResources = await fetchPathResources(
          get().namespaceId,
          fullPath,
          resource
        );
        const resourcesById = new Map(pathResources.map(res => [res.id, res]));

        set(s => {
          for (let i = 0; i < fullPath.length; i++) {
            const item = fullPath[i];
            const parentId =
              i === 0 ? s.rootIds[spaceType] : fullPath[i - 1].id;
            const pathResource = resourcesById.get(item.id);
            if (!pathResource) continue;

            if (!(item.id in s.nodes)) {
              s.nodes[item.id] = createNode(pathResource, parentId, spaceType);
            } else {
              patchNodeFromSharedResource(s.nodes[item.id], pathResource);
            }
            const node = s.nodes[item.id];
            if (node && i < fullPath.length - 1) {
              node.hasChildren = true;
            }
            ensureUI(s, item.id);
          }

          for (let i = 0; i < fullPath.length - 1; i++) {
            const parent = s.nodes[fullPath[i].id];
            const child = s.nodes[fullPath[i + 1].id];
            if (parent && child && !parent.children.includes(child.id)) {
              parent.children.push(child.id);
              child.parentId = parent.id;
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
        const idsToExpand = options?.expandTarget
          ? [...parentIds, targetId]
          : parentIds;
        await Promise.all(
          idsToExpand.map(async pid => {
            const ui = get().ui[pid];
            const n = get().nodes[pid];
            const shouldLoad =
              pid === targetId
                ? options?.expandTarget && n?.hasChildren
                : n?.hasChildren;
            if (n && ui && !ui.loaded && shouldLoad) {
              await get().expand(pid);
            }
          })
        );
      } catch (err) {
        const status = (err as { response?: { status?: number } }).response
          ?.status;
        if (status !== 404) {
          console.error('[sidebar] expandPathTo failed:', err);
        }
      }
    },
  };
}
