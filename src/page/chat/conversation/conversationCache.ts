import { ConversationDetail } from '@/page/chat/core/types/conversation';
import { getTitleFromConversationDetail } from '@/page/chat/utils';

const conversationCache = new Map<string, ConversationDetail>();

/** Keep the latest conversation payload so Copilot → full-page remounts stay warm. */
export function setCachedConversation(conversation: ConversationDetail) {
  if (!conversation.id) return;
  conversationCache.set(conversation.id, conversation);
}

export function getCachedConversation(
  conversationId: string
): ConversationDetail | undefined {
  if (!conversationId) return undefined;
  return conversationCache.get(conversationId);
}

export function getCachedConversationTitle(conversationId: string) {
  const cached = getCachedConversation(conversationId);
  if (!cached) return undefined;
  return getTitleFromConversationDetail(cached);
}

export function clearCachedConversation(conversationId: string) {
  conversationCache.delete(conversationId);
}
