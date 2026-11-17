import { http } from '@/lib/request';
import { clearChatInputDraft } from '@/page/chat/chat-input/chatInputDraft';
import {
  clearCachedConversation,
  getCurrentUserId,
} from '@/page/chat/conversation/conversationCache';
import { clearProvisionalConversation } from '@/page/chat/conversations/provisionalConversation';
import type { ConversationSummary } from '@/page/chat/core/types/conversation';

interface ConversationPage {
  total: number;
  data: ConversationSummary[];
}

interface ConversationOrderSnapshot {
  ids: string[];
  complete: boolean;
}

const conversationOrders = new Map<string, ConversationOrderSnapshot>();
const conversationOrderVersions = new Map<string, number>();
const deletedConversations = new Map<string, Set<string>>();
const FETCH_PAGE_SIZE = 100;
const MAX_FETCH_PAGES = 20;

function conversationOrderKey(namespaceId: string) {
  return JSON.stringify([getCurrentUserId(), namespaceId]);
}

function bumpConversationOrderVersion(key: string) {
  const version = (conversationOrderVersions.get(key) ?? 0) + 1;
  conversationOrderVersions.set(key, version);
  return version;
}

export function adjacentConversationId(
  orderedIds: readonly string[],
  conversationId: string
) {
  const index = orderedIds.indexOf(conversationId);
  if (index < 0) return null;
  return orderedIds[index + 1] ?? orderedIds[index - 1] ?? null;
}

export function rememberConversationOrder(
  namespaceId: string,
  conversations: Pick<ConversationSummary, 'id'>[],
  complete = false
) {
  if (!namespaceId) return;
  const key = conversationOrderKey(namespaceId);
  bumpConversationOrderVersion(key);
  conversationOrders.set(key, {
    ids: conversations.map(conversation => conversation.id),
    complete,
  });
}

/** Check whether a conversation was successfully deleted in this user scope. */
export function isConversationDeleted(
  namespaceId: string,
  conversationId: string
) {
  if (!namespaceId || !conversationId) return false;
  return (
    deletedConversations
      .get(conversationOrderKey(namespaceId))
      ?.has(conversationId) ?? false
  );
}

export function getCachedConversationOrderIds(namespaceId: string) {
  if (!namespaceId) return [];
  return [
    ...(conversationOrders.get(conversationOrderKey(namespaceId))?.ids ?? []),
  ];
}

/**
 * Prefer the resolved candidate when it is still alive, then fall back to the
 * nearest surviving item in the supplied order.
 */
export function selectAvailableAdjacentConversationId(
  namespaceId: string,
  conversationId: string,
  orderedIds: readonly string[],
  candidateConversationId: string | null
) {
  if (
    candidateConversationId &&
    candidateConversationId !== conversationId &&
    !isConversationDeleted(namespaceId, candidateConversationId)
  ) {
    return candidateConversationId;
  }
  const remainingConversationIds = orderedIds.filter(
    id => id === conversationId || !isConversationDeleted(namespaceId, id)
  );
  return adjacentConversationId(remainingConversationIds, conversationId);
}

export function forgetConversationFromOrder(
  namespaceId: string,
  conversationId: string
) {
  if (!namespaceId) return;
  const key = conversationOrderKey(namespaceId);
  bumpConversationOrderVersion(key);
  const snapshot = conversationOrders.get(key);
  if (!snapshot) return;
  conversationOrders.set(key, {
    ...snapshot,
    ids: snapshot.ids.filter(id => id !== conversationId),
  });
}

/** Clear state that must not survive after a conversation is deleted. */
export function clearDeletedConversationState(
  namespaceId: string,
  conversationId: string
) {
  const key = conversationOrderKey(namespaceId);
  const deletedIds = deletedConversations.get(key) ?? new Set<string>();
  deletedIds.add(conversationId);
  deletedConversations.set(key, deletedIds);
  const scope = { userId: getCurrentUserId(), namespaceId };
  clearCachedConversation(scope, conversationId);
  clearChatInputDraft(conversationId);
  clearProvisionalConversation(scope, conversationId);
  forgetConversationFromOrder(namespaceId, conversationId);
}

async function fetchConversationOrder(
  namespaceId: string,
  conversationId: string,
  orderKey: string,
  initialFallbackId: string | null,
  isCurrentVersion: () => boolean
) {
  const ids: string[] = [];
  const seen = new Set<string>();
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;
  let fallbackId = initialFallbackId;
  let complete = false;

  for (let page = 0; page < MAX_FETCH_PAGES; page += 1) {
    const response: ConversationPage = await http.get(
      `/namespaces/${namespaceId}/conversations?offset=${offset}&limit=${FETCH_PAGE_SIZE}&order=desc`,
      { mute: true, timeout: 5000 }
    );
    const items = Array.isArray(response?.data) ? response.data : [];
    items.forEach(item => {
      if (seen.has(item.id)) return;
      seen.add(item.id);
      ids.push(item.id);
    });
    if (typeof response?.total === 'number') {
      total = response.total;
    }

    const index = ids.indexOf(conversationId);
    if (index >= 0) {
      const nextId = ids[index + 1];
      if (nextId) {
        if (isCurrentVersion()) {
          conversationOrders.set(orderKey, { ids, complete: false });
        }
        return nextId;
      }
      fallbackId = ids[index - 1] ?? initialFallbackId;
    }

    offset += items.length;
    complete = items.length === 0 || offset >= total;
    if (complete) break;
  }

  if (isCurrentVersion()) {
    conversationOrders.set(orderKey, { ids, complete });
  }
  return fallbackId;
}

/**
 * Resolve the visually adjacent conversation before deleting the current one.
 * The loaded sidebar order is preferred so deleting does not issue a request.
 */
export async function resolveAdjacentConversationId(
  namespaceId: string,
  conversationId: string
) {
  let fallbackId: string | null = null;
  const key = conversationOrderKey(namespaceId);
  const version = conversationOrderVersions.get(key) ?? 0;
  const isCurrentVersion = () =>
    (conversationOrderVersions.get(key) ?? 0) === version;
  const snapshot = conversationOrders.get(key);
  if (snapshot) {
    const index = snapshot.ids.indexOf(conversationId);
    if (index >= 0) {
      const nextId = snapshot.ids[index + 1];
      if (nextId) return nextId;
      fallbackId = snapshot.ids[index - 1] ?? null;
      if (snapshot.complete) return fallbackId;
    }
  }

  let loadedId: string | null;
  try {
    loadedId = await fetchConversationOrder(
      namespaceId,
      conversationId,
      key,
      fallbackId,
      isCurrentVersion
    );
  } catch {
    loadedId = fallbackId;
  }

  if (!isCurrentVersion()) {
    const latest = conversationOrders.get(key);
    const latestIndex = latest?.ids.indexOf(conversationId) ?? -1;
    if (latest && latestIndex >= 0) {
      const latestNextId = latest.ids[latestIndex + 1];
      if (latestNextId) return latestNextId;
      if (latest.complete) {
        return latest.ids[latestIndex - 1] ?? null;
      }
    }
  }
  return loadedId;
}
