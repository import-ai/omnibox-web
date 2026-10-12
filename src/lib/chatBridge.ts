import { t } from 'i18next';

import type App from '@/hooks/app.class';
import { normalizeResourceMeta, ResourceMetaLike } from '@/lib/resourceMeta';
import {
  clearChatInputDraft,
  createChatInputDraft,
  getChatInputDraft,
  saveChatInputDraft,
} from '@/page/chat/chat-input/chatInputDraft';
import { syncComposerResources } from '@/page/chat/chat-input/composerExternalSync';
import { normalizeResourceContexts } from '@/page/chat/chat-input/resourceContexts';
import type { PrivateSearchResourceType } from '@/page/chat/chat-input/types';
import { useChatStore } from '@/page/chat/chatStore';
import {
  getCopilotWorkspace,
  useCopilotStore,
} from '@/page/copilot/copilotStore';

export function getChatHomeDraftScope(namespaceId: string) {
  return `home:${namespaceId}`;
}

/**
 * Clears chat context and unsent home input when leaving a namespace.
 * Also bumps a reset nonce so the composer drops tool tokens before draft sync.
 */
export function resetChatForNamespaceSwitch(namespaceId: string) {
  clearChatInputDraft(getChatHomeDraftScope(namespaceId));
  const store = useChatStore.getState();
  store.requestChatInputReset();
  store.clearContext();
}

/**
 * Opens Copilot beside the current resource page so added context is visible.
 * Keeps an active conversation; otherwise lands on Copilot home.
 */
export function openCopilotForChatContext(
  namespaceId: string,
  app: Pick<App, 'hasHook' | 'fire'>
) {
  const store = useCopilotStore.getState();
  const workspace = getCopilotWorkspace(store, namespaceId);
  const conversationId =
    workspace.view === 'conversation' || workspace.view === 'resource_history'
      ? workspace.conversationId
      : null;
  const draftScope = conversationId ?? getChatHomeDraftScope(namespaceId);
  const draft = getChatInputDraft(draftScope);
  if (draft) {
    // Sync before the panel remounts, otherwise draft restore drops new context.
    const chatStore = useChatStore.getState();
    const resources = normalizeResourceContexts([
      ...draft.selectedResources,
      ...chatStore.selectedResources,
    ]);
    const composerState = syncComposerResources(
      draft.composerState,
      resources,
      t('untitled')
    );
    saveChatInputDraft(draftScope, createChatInputDraft(composerState));
    chatStore.setContext(resources);
  }
  // The event bus buffers unhandled events; do not queue a stale panel close.
  if (app.hasHook('close_resource_comments')) {
    app.fire('close_resource_comments', namespaceId);
  }
  if (conversationId) {
    store.showConversation(namespaceId, conversationId);
    return;
  }
  store.showHome(namespaceId);
}

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

import type { SendMessageParams } from '@/page/chat/chat-input/types';

const pendingChatPayloads = new Map<string, SendMessageParams>();
export function setPendingChatPayload(id: string, payload: SendMessageParams) {
  pendingChatPayloads.set(id, payload);
}
export function takePendingChatPayload(id: string) {
  const payload = pendingChatPayloads.get(id);
  pendingChatPayloads.delete(id);
  return payload;
}
