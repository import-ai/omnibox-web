import { withSmartFolderChildSidebarAttrs } from '@/page/sidebar/components/smart-folder';
import type { TreeNode } from '@/page/sidebar/store';
import { fetchChildren, fetchSmartFolderChildren } from '@/service/resource';

export async function fetchChildrenForSidebarRefresh(
  namespaceId: string,
  node: TreeNode
) {
  if (node.resourceType === 'rss_folder') return null;

  const children =
    node.resourceType === 'smart_folder'
      ? await fetchSmartFolderChildren(namespaceId, node.id)
      : await fetchChildren(namespaceId, node.id);

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
