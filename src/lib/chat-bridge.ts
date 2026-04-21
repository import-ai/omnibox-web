import type { ResourceMeta } from '@/interface';
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
  useChatStore.getState().addContext(resource as ResourceMeta, type);
}
