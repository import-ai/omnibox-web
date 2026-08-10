import type { ConversationDetail } from '@/page/chat/core/types/conversation';
import { getTitleFromConversationDetail } from '@/page/chat/utils';

export interface ConversationCacheScope {
  userId: string;
  namespaceId: string;
}

interface ConversationCacheEntry {
  conversation: ConversationDetail;
  revision: number;
}

const MAX_CACHED_CONVERSATIONS = 20;
const conversationCache = new Map<string, ConversationCacheEntry>();
let nextRevision = 1;

function getCacheKey(
  scope: ConversationCacheScope,
  conversationId: string
): string | undefined {
  if (!scope.userId || !scope.namespaceId || !conversationId) {
    return undefined;
  }
  return JSON.stringify([scope.userId, scope.namespaceId, conversationId]);
}

/** Read the identity used to scope in-memory conversation data. */
export function getCurrentUserId() {
  return typeof window === 'undefined'
    ? ''
    : window.localStorage.getItem('uid') || '';
}

/** Empty placeholders must not overwrite a cleared sensitive cache entry. */
export function hasConversationContent(conversation: ConversationDetail) {
  return Boolean(
    conversation.title || Object.keys(conversation.mapping).length > 0
  );
}

function touchCacheEntry(cacheKey: string, entry: ConversationCacheEntry) {
  conversationCache.delete(cacheKey);
  conversationCache.set(cacheKey, entry);
}

function evictLeastRecentlyUsedConversation() {
  while (conversationCache.size > MAX_CACHED_CONVERSATIONS) {
    const leastRecentlyUsedKey = conversationCache.keys().next().value;
    if (typeof leastRecentlyUsedKey !== 'string') return;
    conversationCache.delete(leastRecentlyUsedKey);
  }
}

/** Keep the latest conversation payload so Copilot → full-page remounts stay warm. */
export function setCachedConversation(
  scope: ConversationCacheScope,
  conversation: ConversationDetail
) {
  const cacheKey = getCacheKey(scope, conversation.id);
  if (!cacheKey) return;
  const existingEntry = conversationCache.get(cacheKey);
  if (existingEntry?.conversation === conversation) {
    touchCacheEntry(cacheKey, existingEntry);
    return existingEntry.revision;
  }
  const entry = { conversation, revision: nextRevision };
  nextRevision += 1;
  touchCacheEntry(cacheKey, entry);
  evictLeastRecentlyUsedConversation();
  return entry.revision;
}

export function getCachedConversation(
  scope: ConversationCacheScope,
  conversationId: string
): ConversationDetail | undefined {
  const cacheKey = getCacheKey(scope, conversationId);
  if (!cacheKey) return undefined;
  const entry = conversationCache.get(cacheKey);
  if (!entry) return undefined;
  touchCacheEntry(cacheKey, entry);
  return entry.conversation;
}

/** Return the current cache revision without changing LRU order. */
export function getCachedConversationRevision(
  scope: ConversationCacheScope,
  conversationId: string
) {
  const cacheKey = getCacheKey(scope, conversationId);
  if (!cacheKey) return undefined;
  return conversationCache.get(cacheKey)?.revision;
}

export function getCachedConversationTitle(
  scope: ConversationCacheScope,
  conversationId: string
) {
  const cached = getCachedConversation(scope, conversationId);
  if (!cached) return undefined;
  return getTitleFromConversationDetail(cached);
}

export function clearCachedConversation(
  scope: ConversationCacheScope,
  conversationId: string
) {
  const cacheKey = getCacheKey(scope, conversationId);
  if (cacheKey) conversationCache.delete(cacheKey);
}

/** Delete stale data only when no newer writer has replaced it. */
export function clearCachedConversationIfUnchanged(
  scope: ConversationCacheScope,
  conversationId: string,
  expectedRevision: number | undefined
) {
  if (expectedRevision === undefined) return false;
  const cacheKey = getCacheKey(scope, conversationId);
  if (!cacheKey) return false;
  const entry = conversationCache.get(cacheKey);
  if (entry?.revision !== expectedRevision) return false;
  conversationCache.delete(cacheKey);
  return true;
}

/** Clear all in-memory conversations when the authenticated identity changes. */
export function clearConversationCache() {
  conversationCache.clear();
}
