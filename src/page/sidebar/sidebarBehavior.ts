import type { Resource, SpaceType } from '@/interface';
import { withSmartFolderChildSidebarAttrs } from '@/page/sidebar/components/smart-folder';
import type { NodeUI, TreeNode } from '@/page/sidebar/store';
import type { ResourceSortOptions } from '@/service/resource';
import { fetchChildren, fetchSmartFolderChildren } from '@/service/resource';

export function getExpandedNodeIdsForSidebarRefresh(
  nodes: Record<string, TreeNode>,
  ui: Record<string, NodeUI>,
  rootIds: Record<SpaceType, string>
) {
  const rootIdSet = new Set(Object.values(rootIds).filter(Boolean));

  return Object.entries(ui)
    .filter(([id, nodeUI]) => {
      const node = nodes[id];
      return (
        !!node &&
        nodeUI.expanded &&
        (nodeUI.loaded || node.resourceType === 'rss_folder') &&
        (node.hasChildren ||
          node.resourceType === 'folder' ||
          node.resourceType === 'smart_folder' ||
          node.resourceType === 'rss_folder') &&
        !rootIdSet.has(id)
      );
    })
    .map(([id]) => id);
}

export async function fetchChildrenForSidebarRefresh(
  namespaceId: string,
  node: TreeNode,
  sort?: ResourceSortOptions
): Promise<Resource[] | null> {
  if (node.resourceType === 'rss_folder') return null;

  const children =
    node.resourceType === 'smart_folder'
      ? await fetchSmartFolderChildren(namespaceId, node.id)
      : await fetchChildren(namespaceId, node.id, sort);

  return node.resourceType === 'smart_folder'
    ? children.map(child => withSmartFolderChildSidebarAttrs(child, node.id))
    : children;
}

export function isCurrentRssItemRoute(
  pathname: string,
  namespaceId: string,
  folderId: string
) {
  const segments = pathname.split('/').filter(Boolean);
  return (
    segments[0] === namespaceId &&
    segments[1] === folderId &&
    segments[2] === 'rss-items' &&
    Boolean(segments[3])
  );
}
