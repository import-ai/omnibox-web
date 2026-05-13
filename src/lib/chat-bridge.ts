import { normalizeResourceMeta, ResourceMetaLike } from '@/lib/resource-meta';
import type { PrivateSearchResourceType } from '@/page/chat/chat-input/types';
import { useChatStore } from '@/page/chat/chat-store';

/**
 * Cross-module bridge: sidebar → chat context.
 *
 * This function lives outside `src/page/sidebar` so that sidebar
 * internals never directly touch the event bus.
 */
export function addToChatContext(
  resource: unknown,
  type: PrivateSearchResourceType
) {
  const resourceMeta = normalizeResourceMeta(resource as ResourceMetaLike);
  useChatStore.getState().addContext(resourceMeta, type);
}

export function removeFromChatContext(resourceIds: string[]) {
  if (resourceIds.length === 0) return;

  const removedIds = new Set(resourceIds);
  const store = useChatStore.getState();
  for (const id of removedIds) {
    store.removeContext(id);
  }
}
