import type {
  NodeUI,
  SidebarState,
  TreeNode,
} from '@/page/share/sidebar/store/types';

import type { ResourcePickerResource } from './resourcePickerTypes';

type ShareSidebarCacheState = Pick<
  SidebarState,
  'namespaceId' | 'nodes' | 'ui'
>;

export function treeNodeToPickerResource(
  node: TreeNode
): ResourcePickerResource {
  return {
    id: node.id,
    name: node.name,
    parent_id: node.parentId,
    resource_type: node.resourceType,
    attrs: node.attrs,
    has_children: node.hasChildren,
    created_at: node.createdAt || undefined,
    updated_at: node.updatedAt || undefined,
  };
}

function mapLoadedChildren(
  nodes: Record<string, TreeNode>,
  parent: TreeNode
): ResourcePickerResource[] {
  return parent.children
    .map(childId => nodes[childId])
    .filter((child): child is TreeNode => Boolean(child))
    .map(treeNodeToPickerResource);
}

function isLoadedNode(ui: Record<string, NodeUI>, resourceId: string): boolean {
  return Boolean(ui[resourceId]?.loaded);
}

/** Builds picker children cache from share sidebar nodes that already finished loading. */
export function buildShareResourcePickerChildrenById(
  state: ShareSidebarCacheState,
  shareId: string
): Record<string, ResourcePickerResource[]> {
  if (state.namespaceId !== shareId) return {};

  const childrenById: Record<string, ResourcePickerResource[]> = {};
  for (const [id, node] of Object.entries(state.nodes)) {
    if (!isLoadedNode(state.ui, id)) continue;
    childrenById[id] = mapLoadedChildren(state.nodes, node);
  }
  return childrenById;
}

/** Returns cached children when the share sidebar has already loaded this node. */
export function getShareSidebarLoadedChildren(
  state: ShareSidebarCacheState,
  shareId: string,
  resourceId: string
): ResourcePickerResource[] | null {
  if (state.namespaceId !== shareId) return null;
  if (!isLoadedNode(state.ui, resourceId)) return null;
  const node = state.nodes[resourceId];
  if (!node) return null;
  return mapLoadedChildren(state.nodes, node);
}
