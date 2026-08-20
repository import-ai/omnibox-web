import type { Resource, SpaceType } from '@/interface';
import { withSmartFolderChildSidebarAttrs } from '@/page/sidebar/components/smart-folder';
import type { NodeUI, TreeNode } from '@/page/sidebar/store';
import { fetchChildren, fetchSmartFolderChildren } from '@/service/resource';
import type { ResourceSortOptions } from '@/service/resourceSort';
import { RSS_ITEM_SORT, rssTreeChildrenParams } from '@/service/resourceSort';

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
        nodeUI.loaded &&
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
): Promise<Resource[]> {
  const children =
    node.resourceType === 'smart_folder'
      ? await fetchSmartFolderChildren(namespaceId, node.id)
      : await fetchChildren(
          namespaceId,
          node.id,
          node.resourceType === 'rss_folder' ? RSS_ITEM_SORT : sort,
          { params: rssTreeChildrenParams(node.resourceType) }
        );

  return node.resourceType === 'smart_folder'
    ? children.map(child => withSmartFolderChildSidebarAttrs(child, node.id))
    : children;
}
