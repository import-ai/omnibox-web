import type { Resource, ResourceType } from '@/interface';
import {
  createResource,
  moveResource,
  renameResource,
  restoreResource,
} from '@/service/resource';

import type { SidebarGet, SidebarSet } from '../types';
import {
  createNode,
  detectSpaceType,
  ensureUI,
  findNextActiveId,
  getDescendantIds,
  isDescendant,
  traverseDescendants,
} from '../utils';

export function buildCRUDActions(set: SidebarSet, get: SidebarGet) {
  return {
    create: async (parentId: string, type: ResourceType, name?: string) => {
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

      const response = await createResource(get().namespaceId, payload);

      set(s => {
        const node = createNode(response, parentId, parent.spaceType);
        s.nodes[node.id] = node;

        const p = s.nodes[parentId];
        if (p) {
          p.children.unshift(node.id);
          p.hasChildren = true;
          const pui = ensureUI(s, parentId);
          pui.expanded = true;
        }
      });

      return response.id;
    },

    remove: (id: string, currentResourceId?: string) => {
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

    rename: async (id: string, name: string) => {
      await renameResource(get().namespaceId, id, name);

      set(s => {
        const node = s.nodes[id];
        if (node) node.name = name;
      });
    },

    move: async (dragId: string, dropId: string) => {
      const drag = get().nodes[dragId];
      const drop = get().nodes[dropId];
      if (!drag || !drop) return;

      if (isDescendant(get().nodes, dragId, dropId)) return;

      const oldParentId = drag.parentId;
      const oldSpaceType = drag.spaceType;
      const oldParentChildren = oldParentId
        ? [...(get().nodes[oldParentId]?.children ?? [])]
        : [];
      const oldParentHasChildren = oldParentId
        ? (get().nodes[oldParentId]?.hasChildren ?? false)
        : false;

      const oldDescendantSpaceTypes = new Map<
        string,
        'private' | 'teamspace'
      >();
      traverseDescendants(get().nodes, dragId, n => {
        oldDescendantSpaceTypes.set(n.id, n.spaceType);
      });

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

      try {
        await moveResource(get().namespaceId, dragId, dropId);
      } catch {
        set(s => {
          const draftDrag = s.nodes[dragId];
          if (draftDrag) {
            draftDrag.parentId = oldParentId;
            draftDrag.spaceType = oldSpaceType;
          }

          if (oldParentId) {
            const oldParent = s.nodes[oldParentId];
            if (oldParent) {
              oldParent.children = oldParentChildren;
              oldParent.hasChildren = oldParentHasChildren;
            }
          }

          const newParent = s.nodes[dropId];
          if (newParent) {
            newParent.children = newParent.children.filter(
              cid => cid !== dragId
            );
            newParent.hasChildren = newParent.children.length > 0;
          }

          for (const [id, spaceType] of oldDescendantSpaceTypes) {
            const node = s.nodes[id];
            if (node) node.spaceType = spaceType;
          }
        });

        throw new Error('Move failed');
      }
    },

    restore: async (resourceOrId: string | Resource): Promise<string> => {
      const resource: Resource =
        typeof resourceOrId === 'string'
          ? await restoreResource(get().namespaceId, resourceOrId)
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
  };
}
