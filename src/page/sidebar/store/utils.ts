import { Resource, SpaceType } from '@/interface';

import type { SidebarState, TreeNode } from './types';

type ResourceWithChildrenState = Resource & { hasChildren?: boolean };

function getResourceHasChildren(resource: ResourceWithChildrenState): boolean {
  return resource.has_children ?? resource.hasChildren ?? false;
}

export function createNode(
  resource: Resource,
  parentId: string | null,
  spaceType: SpaceType
): TreeNode {
  const resourceWithChildrenState = resource as ResourceWithChildrenState;
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
    hasChildren: getResourceHasChildren(resourceWithChildrenState),
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

  // Prefer the next sibling (visually below), fallback to previous
  const next = parent.children[idx + 1];
  if (next) {
    return next;
  }

  const prev = parent.children[idx - 1];
  if (prev) {
    return prev;
  }

  return null;
}

export function patchNodeFromResource(
  node: TreeNode,
  resource: Resource
): void {
  const resourceWithChildrenState = resource as ResourceWithChildrenState;
  node.name = resource.name || '';
  node.hasChildren = getResourceHasChildren(resourceWithChildrenState);
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

export function ensureUI(s: SidebarState, id: string) {
  if (!s.ui[id]) {
    s.ui[id] = { expanded: false, loading: false, loaded: false };
  }
  return s.ui[id];
}

export function getSelectableDescendantIds(
  nodes: Record<string, TreeNode>,
  id: string
): string[] {
  return [id, ...getDescendantIds(nodes, id)];
}

export function getVisibleNodeIds(
  state: Pick<SidebarState, 'nodes' | 'rootIds' | 'spaceExpanded' | 'ui'>
): string[] {
  const result: string[] = [];

  const visit = (id: string) => {
    const node = state.nodes[id];
    if (!node) return;
    result.push(id);
    if (!state.ui[id]?.expanded) return;
    for (const childId of node.children) {
      visit(childId);
    }
  };

  for (const spaceType of Object.keys(state.rootIds) as SpaceType[]) {
    if (state.spaceExpanded[spaceType] === false) continue;
    const root = state.nodes[state.rootIds[spaceType]];
    if (!root) continue;
    for (const childId of root.children) {
      visit(childId);
    }
  }

  return result;
}

export function getIdsInVisibleRange(
  state: Pick<SidebarState, 'nodes' | 'rootIds' | 'spaceExpanded' | 'ui'>,
  startId: string,
  endId: string
): string[] {
  const order = getVisibleNodeIds(state);
  const startIndex = order.indexOf(startId);
  const endIndex = order.indexOf(endId);
  if (startIndex < 0 || endIndex < 0) {
    return [endId];
  }
  const [from, to] = [startIndex, endIndex].sort((a, b) => a - b);
  return order.slice(from, to + 1);
}

export function calculateSelectedCount(
  nodes: Record<string, TreeNode>,
  selectedIds: Record<string, boolean>
): number {
  const countNode = (id: string): number => {
    const node = nodes[id];
    if (!node) return 0;

    if (node.children.length === 0) {
      return selectedIds[id] ? 1 : 0;
    }

    if (isNodeFullySelected(nodes, selectedIds, id)) {
      return 1;
    }

    return node.children.reduce((count, childId) => {
      return count + countNode(childId);
    }, 0);
  };

  return (Object.values(nodes).filter(node => !node.parentId) as TreeNode[])
    .flatMap(root => root.children)
    .reduce((count, id) => count + countNode(id), 0);
}

export function isNodeFullySelected(
  nodes: Record<string, TreeNode>,
  selectedIds: Record<string, boolean>,
  id: string
): boolean {
  const node = nodes[id];
  if (!node) {
    return false;
  }

  if (node.children.length === 0) {
    return Boolean(selectedIds[id]);
  }

  return node.children.every(childId =>
    isNodeFullySelected(nodes, selectedIds, childId)
  );
}

export function isNodeIndeterminate(
  nodes: Record<string, TreeNode>,
  selectedIds: Record<string, boolean>,
  id: string
): boolean {
  const node = nodes[id];
  if (!node || node.children.length === 0) {
    return false;
  }

  if (isNodeFullySelected(nodes, selectedIds, id)) {
    return false;
  }

  return (
    Boolean(selectedIds[id]) ||
    node.children.some(
      childId =>
        isNodeFullySelected(nodes, selectedIds, childId) ||
        isNodeIndeterminate(nodes, selectedIds, childId)
    )
  );
}

export function isNodeDimmedBySelection(
  nodes: Record<string, TreeNode>,
  selectedIds: Record<string, boolean>,
  id: string
): boolean {
  let current = nodes[id];
  while (current?.parentId) {
    const parent = nodes[current.parentId];
    if (
      parent?.parentId &&
      isNodeFullySelected(nodes, selectedIds, parent.id)
    ) {
      return true;
    }
    current = parent;
  }
  return false;
}

export function getTopLevelSelectedIds(
  nodes: Record<string, TreeNode>,
  ids: string[]
): string[] {
  const selected = new Set(ids);
  return ids.filter(id => {
    let current = nodes[id];
    while (current?.parentId) {
      if (selected.has(current.parentId)) {
        return false;
      }
      current = nodes[current.parentId];
    }
    return true;
  });
}
