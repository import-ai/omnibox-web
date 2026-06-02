import { PathItem, Resource, SpaceType } from '@/interface';
import { isSmartFolderChildResource } from '@/page/sidebar/components/smart-folder';

import type { SidebarState, TreeNode } from './types';

type ResourceWithChildrenState = Resource & { hasChildren?: boolean };

function getResourceHasChildren(resource: ResourceWithChildrenState): boolean {
  if (resource.resource_type === 'smart_folder') {
    return true;
  }

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

export function buildNodePath(
  nodes: Record<string, TreeNode>,
  id: string
): PathItem[] | undefined {
  const path: PathItem[] = [];
  const visitedIds = new Set<string>();
  let current = nodes[id];

  while (current) {
    if (visitedIds.has(current.id)) {
      return undefined;
    }
    visitedIds.add(current.id);
    path.unshift({ id: current.id, name: current.name });

    if (!current.parentId) {
      break;
    }
    current = nodes[current.parentId];
  }

  return path.length > 0 ? path : undefined;
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
  deletedId: string,
  excludedIds: Set<string> = new Set()
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
  const next = parent.children.slice(idx + 1).find(id => !excludedIds.has(id));
  if (next) {
    return next;
  }

  const prev = parent.children
    .slice(0, idx)
    .reverse()
    .find(id => !excludedIds.has(id));
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

export function collapseEmptyNode(
  state: Pick<SidebarState, 'nodes' | 'ui'>,
  id: string
): void {
  const node = state.nodes[id];
  if (!node || node.children.length > 0) {
    return;
  }
  node.hasChildren = false;
  const ui = state.ui[id];
  if (ui) {
    ui.expanded = false;
  }
}

export function isBatchSelectableNode(node?: TreeNode | null): boolean {
  return !isSmartFolderChildResource(node);
}

export function getSelectedAncestorId(
  nodes: Record<string, TreeNode>,
  selectedIds: Record<string, boolean>,
  id: string
): string | null {
  let current = nodes[id];
  while (current?.parentId) {
    const parent = nodes[current.parentId];
    if (parent?.parentId && selectedIds[parent.id]) {
      return parent.id;
    }
    current = parent;
  }
  return null;
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

    if (selectedIds[id]) {
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
  return Boolean(
    nodes[id] &&
    (selectedIds[id] || getSelectedAncestorId(nodes, selectedIds, id))
  );
}

export function isNodeDimmedBySelection(
  nodes: Record<string, TreeNode>,
  selectedIds: Record<string, boolean>,
  id: string
): boolean {
  return getSelectedAncestorId(nodes, selectedIds, id) !== null;
}

export function getTopLevelSelectedIds(
  nodes: Record<string, TreeNode>,
  ids: string[]
): string[] {
  const selected = new Set(ids);
  return ids.filter(id => {
    if (!isBatchSelectableNode(nodes[id])) {
      return false;
    }

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

export interface BatchSelectionSummary {
  selectedCount: number;
  hasSmartFolder: boolean;
  hasOnlySmartFolders: boolean;
  isMixed: boolean;
}

export function getBatchSelectionSummary(
  nodes: Record<string, TreeNode>,
  selectedIds: Record<string, boolean> | string[]
): BatchSelectionSummary {
  const ids = Array.isArray(selectedIds)
    ? selectedIds
    : Object.keys(selectedIds).filter(id => selectedIds[id]);
  const topLevelIds = getTopLevelSelectedIds(nodes, ids);
  let smartFolderCount = 0;
  let regularCount = 0;

  for (const id of topLevelIds) {
    if (nodes[id]?.resourceType === 'smart_folder') {
      smartFolderCount += 1;
    } else {
      regularCount += 1;
    }
  }

  const selectedCount = regularCount + smartFolderCount;
  const hasRegularResource = regularCount > 0;
  const hasSmartFolder = smartFolderCount > 0;

  return {
    selectedCount,
    hasSmartFolder,
    hasOnlySmartFolders: hasSmartFolder && !hasRegularResource,
    isMixed: hasSmartFolder && hasRegularResource,
  };
}
