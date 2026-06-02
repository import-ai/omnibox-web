import { normalizeResourceMeta, ResourceMetaLike } from '@/lib/resourceMeta';
import type { PrivateSearchResourceType } from '@/page/chat/chat-input/types';
import { useChatStore } from '@/page/chat/chatStore';

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
  const contextResourceIds = store.selectedResources
    .filter(item => removedIds.has(item.resource.id))
    .map(item => item.resource.id);

  for (const id of contextResourceIds) {
    store.removeContext(id);
  }
}
