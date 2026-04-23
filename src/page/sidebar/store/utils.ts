import { Resource, SpaceType } from '@/interface';

import type { TreeNode } from './types';

export function createNode(
  resource: Resource,
  parentId: string | null,
  spaceType: SpaceType
): TreeNode {
  return {
    id: resource.id,
    parentId,
    spaceType,
    name: resource.name || '',
    resourceType: resource.resource_type,
    content: resource.content,
    attrs: resource.attrs,
    tags: resource.tags,
    path: resource.path,
    hasChildren: resource.has_children ?? false,
    currentPermission: resource.current_permission,
    globalPermission: resource.global_permission,
    createdAt: resource.created_at || '',
    updatedAt: resource.updated_at || '',
    children: [],
  };
}

export function collectParentIds(
  nodes: Record<string, TreeNode>,
  id: string
): string[] {
  const ids: string[] = [];
  let current = nodes[id];
  while (current?.parentId) {
    ids.unshift(current.parentId);
    current = nodes[current.parentId];
  }
  return ids;
}

export function getDescendantIds(
  nodes: Record<string, TreeNode>,
  id: string
): string[] {
  const result: string[] = [];
  const startNode = nodes[id];
  if (!startNode) {
    return result;
  }

  const stack: string[] = [...startNode.children];
  while (stack.length > 0) {
    const currentId = stack.pop()!;
    result.push(currentId);
    const node = nodes[currentId];
    if (node) {
      for (const childId of node.children) {
        stack.push(childId);
      }
    }
  }
  return result;
}

export function isDescendant(
  nodes: Record<string, TreeNode>,
  ancestorId: string,
  targetId: string
): boolean {
  const stack: string[] = [...(nodes[ancestorId]?.children ?? [])];
  while (stack.length > 0) {
    const currentId = stack.pop()!;
    if (currentId === targetId) {
      return true;
    }
    const node = nodes[currentId];
    if (node) {
      for (const childId of node.children) {
        stack.push(childId);
      }
    }
  }
  return false;
}

export function findNextActiveId(
  nodes: Record<string, TreeNode>,
  deletedId: string
): string | null {
  const deleted = nodes[deletedId];
  if (!deleted?.parentId) {
    return null;
  }

  const parent = nodes[deleted.parentId];
  if (!parent) {
    return null;
  }

  const idx = parent.children.indexOf(deletedId);
  if (idx < 0) {
    return null;
  }

  const sortedSiblings = [...parent.children].sort((a, b) => {
    const nodeA = nodes[a];
    const nodeB = nodes[b];
    if (!nodeA || !nodeB) return 0;
    return nodeB.updatedAt.localeCompare(nodeA.updatedAt);
  });

  const sortedIdx = sortedSiblings.indexOf(deletedId);
  if (sortedIdx < 0) {
    return null;
  }

  const prev = sortedSiblings[sortedIdx - 1];
  if (prev) {
    return prev;
  }

  const next = sortedSiblings[sortedIdx + 1];
  if (next) {
    return next;
  }

  return null;
}

export function patchNodeFromResource(
  node: TreeNode,
  resource: Resource
): void {
  node.name = resource.name || '';
  node.hasChildren = resource.has_children ?? false;
  node.updatedAt = resource.updated_at || '';
  node.resourceType = resource.resource_type;
}

export function traverseDescendants(
  nodes: Record<string, TreeNode>,
  id: string,
  callback: (node: TreeNode) => void
): void {
  const node = nodes[id];
  if (!node) {
    return;
  }
  callback(node);
  for (const childId of node.children) {
    traverseDescendants(nodes, childId, callback);
  }
}

export function detectSpaceType(
  nodes: Record<string, TreeNode>,
  rootIds: Record<SpaceType, string>,
  firstPathId: string
): SpaceType | null {
  for (const [type, rootId] of Object.entries(rootIds)) {
    if (rootId === firstPathId) {
      return type as SpaceType;
    }
    const root = nodes[rootId];
    if (root?.children.includes(firstPathId)) {
      return type as SpaceType;
    }
  }
  return null;
}
