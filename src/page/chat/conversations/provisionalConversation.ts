import { WEB_SEARCH_QUERY_TOKEN } from '@/page/chat/chat-input/composerQuery';
import type { ConversationSummary } from '@/page/chat/core/types/conversation';

export interface ProvisionalConversation {
  id: string;
  title: string;
  created_at: string;
}

export interface ProvisionalConversationPage {
  total: number;
  data: ConversationSummary[];
  confirmedIds: string[];
}

export function messagePreviewTitle(text: string): string {
  return text
    .replaceAll(WEB_SEARCH_QUERY_TOKEN, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function provisionalTitleForSend(options: {
  query: string;
  conversationTitle?: string;
  hasEarlierUserMessage: boolean;
}): string | null {
  if (options.conversationTitle?.trim() || options.hasEarlierUserMessage) {
    return null;
  }
  return messagePreviewTitle(options.query) || null;
}

interface ProvisionalScope {
  userId: string;
  namespaceId: string;
}

const provisionalEntries = new Map<string, ProvisionalConversation>();

function provisionalKey(scope: ProvisionalScope, id: string) {
  return `${scope.userId}\0${scope.namespaceId}\0${id}`;
}

export function rememberProvisionalConversation(
  scope: ProvisionalScope,
  conversation: ProvisionalConversation
) {
  provisionalEntries.set(provisionalKey(scope, conversation.id), conversation);
}

export function clearProvisionalConversation(
  scope: ProvisionalScope,
  id: string
) {
  provisionalEntries.delete(provisionalKey(scope, id));
}

export function readProvisionalConversations(
  scope: ProvisionalScope
): ProvisionalConversation[] {
  const prefix = `${scope.userId}\0${scope.namespaceId}\0`;
  return [...provisionalEntries.entries()]
    .filter(([key]) => key.startsWith(prefix))
    .map(([, conversation]) => conversation);
}

export function resetProvisionalConversations() {
  provisionalEntries.clear();
}

export function applyProvisionalConversations(
  page: { total: number; data: ConversationSummary[] },
  provisional: ProvisionalConversation[]
): ProvisionalConversationPage {
  const confirmedIds: string[] = [];
  const data = page.data.map(item => ({ ...item }));
  const indexById = new Map(data.map((item, index) => [item.id, index]));
  const missing: ConversationSummary[] = [];

  provisional.forEach(item => {
    const title = item.title.trim();
    if (!title) {
      return;
    }
    const index = indexById.get(item.id);
    if (index === undefined) {
      missing.push({
        id: item.id,
        title,
        created_at: item.created_at,
      });
      return;
    }
    const existing = data[index];
    const existingTitle = existing.title?.trim() ?? '';
    if (existingTitle && existingTitle !== title) {
      confirmedIds.push(item.id);
      return;
    }
    data[index] = {
      ...existing,
      title,
      created_at: existing.created_at || item.created_at,
    };
  });

  return {
    total: page.total + missing.length,
    data: [...missing, ...data],
    confirmedIds,
  };
}
