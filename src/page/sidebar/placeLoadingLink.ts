import type { Resource } from '@/interface';

import { useSidebarStore } from './store';
import { sidebarResourceName } from './store/utils';

/**
 * A collected link is visible on its page with the url as its name while
 * analysis is still running. Put that same name on the sidebar row immediately,
 * including when the destination folder's children request is still in flight.
 */
export function placeLoadingLinkInSidebar(
  namespaceId: string,
  resource: Resource | null
) {
  if (!resource || resource.resource_type !== 'link') return;
  const store = useSidebarStore.getState();
  if (!namespaceId || store.namespaceId !== namespaceId) return;
  const name = sidebarResourceName(resource);
  if (!name) return;

  const node = store.nodes[resource.id];
  if (node) {
    if (!node.name) store.patch(resource.id, { name });
    return;
  }
  if (!resource.parent_id) return;
  void store.restore({ ...resource, name });
}
