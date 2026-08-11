import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useEffect } from 'react';

import type App from '@/hooks/app.class';
import { http } from '@/lib/request';
import type {
  ApprovalMode,
  ChatCreatePayload,
  SendMessageParams,
} from '@/page/chat/chat-input/types';
import { getStreamEventId, resumeStream } from '@/page/chat/conversation/utils';
import type { MessageOperator } from '@/page/chat/core/messageOperator';
import type { ConversationDetail } from '@/page/chat/core/types/conversation';
import { getTitleFromConversationDetail } from '@/page/chat/utils';

import {
  clearCachedConversation,
  clearCachedConversationIfUnchanged,
  type ConversationCacheScope,
  getCachedConversationRevision,
  getCurrentUserId,
  setCachedConversation,
} from './conversationCache';
import {
  type ConversationLoadPhase,
  isConversationAccessDenied,
  shouldClearVisibleConversation,
  shouldInvalidateConversation,
} from './conversationLoadPolicy';

export const CHAT_CREATE_PAYLOAD_KEY = 'chat-create-payload';

interface ConversationBootstrapOptions {
  app: App;
  askAbortRef: MutableRefObject<(() => Promise<void>) | null>;
  cacheScope: ConversationCacheScope;
  conversationId: string;
  messageOperator: MessageOperator;
  namespaceId: string;
  sendMessage: (params: SendMessageParams) => Promise<void>;
  setAccessDenied: Dispatch<SetStateAction<boolean>>;
  setConversation: Dispatch<SetStateAction<ConversationDetail>>;
  setInitialApprovalMode: Dispatch<SetStateAction<ApprovalMode | undefined>>;
  setSuppressInitialToolRestore: Dispatch<SetStateAction<boolean>>;
  userId: string;
}

interface ConversationBootstrapRuntime {
  destroyed: boolean;
  resumeFN?: ReturnType<typeof resumeStream>;
}

function emptyConversation(conversationId: string): ConversationDetail {
  return { id: conversationId, mapping: {} };
}

function isActiveRequest(
  options: ConversationBootstrapOptions,
  runtime: ConversationBootstrapRuntime
) {
  return !runtime.destroyed && getCurrentUserId() === options.cacheScope.userId;
}

function clearVisibleConversation(
  options: ConversationBootstrapOptions,
  runtime: ConversationBootstrapRuntime
) {
  const { app, askAbortRef, cacheScope, conversationId, setConversation } =
    options;
  clearCachedConversation(cacheScope, conversationId);
  runtime.resumeFN?.destroy();
  if (askAbortRef.current === runtime.resumeFN?.cancel) {
    askAbortRef.current = null;
  }
  setConversation(emptyConversation(conversationId));
  app.fire('chat:title:clear', { conversationId });
}

function invalidateFailedConversation(
  options: ConversationBootstrapOptions,
  runtime: ConversationBootstrapRuntime,
  phase: ConversationLoadPhase,
  error: unknown,
  expectedRevision: number | undefined
) {
  if (!shouldInvalidateConversation(phase, error)) return;
  if (
    shouldClearVisibleConversation({
      currentUserId: getCurrentUserId(),
      destroyed: runtime.destroyed,
      error,
      requestUserId: options.cacheScope.userId,
    })
  ) {
    clearVisibleConversation(options, runtime);
    return;
  }
  clearCachedConversationIfUnchanged(
    options.cacheScope,
    options.conversationId,
    expectedRevision
  );
}

async function loadConversation(
  options: ConversationBootstrapOptions,
  runtime: ConversationBootstrapRuntime,
  phase: ConversationLoadPhase
): Promise<ConversationDetail | undefined> {
  const { app, cacheScope, conversationId, namespaceId, setConversation } =
    options;
  const expectedRevision = getCachedConversationRevision(
    cacheScope,
    conversationId
  );
  try {
    const response: ConversationDetail = await http.get(
      `/namespaces/${namespaceId}/conversations/${conversationId}`
    );
    if (!isActiveRequest(options, runtime)) return undefined;
    setCachedConversation(cacheScope, response);
    const title = getTitleFromConversationDetail(response);
    if (title) app.fire('chat:title:update', { conversationId, title });
    setConversation(response);
    return response;
  } catch (error) {
    if (
      isActiveRequest(options, runtime) &&
      isConversationAccessDenied(error)
    ) {
      options.setAccessDenied(true);
    }
    invalidateFailedConversation(
      options,
      runtime,
      phase,
      error,
      expectedRevision
    );
    return undefined;
  }
}

function resumeLoadedConversation(
  options: ConversationBootstrapOptions,
  runtime: ConversationBootstrapRuntime,
  conversation: ConversationDetail
) {
  if (!isActiveRequest(options, runtime)) return;
  const { askAbortRef, conversationId, messageOperator, namespaceId } = options;
  runtime.resumeFN = resumeStream(
    conversationId,
    messageOperator,
    `/api/v1/namespaces/${namespaceId}/wizard/stream/resume`,
    getStreamEventId(conversation)
  );
  askAbortRef.current = runtime.resumeFN.cancel;
  void runtime.resumeFN.start().finally(() => {
    if (askAbortRef.current === runtime.resumeFN?.cancel) {
      askAbortRef.current = null;
    }
    if (isActiveRequest(options, runtime)) {
      void loadConversation(options, runtime, 'refresh');
    }
  });
}

function startConversationBootstrap(options: ConversationBootstrapOptions) {
  if (!options.conversationId) return;
  options.setAccessDenied(false);
  const state = sessionStorage.getItem(CHAT_CREATE_PAYLOAD_KEY);
  const payload: ChatCreatePayload | undefined = state
    ? JSON.parse(state)
    : undefined;
  options.setInitialApprovalMode(payload?.approvalMode);
  options.setSuppressInitialToolRestore(Boolean(payload));
  const runtime: ConversationBootstrapRuntime = { destroyed: false };
  if (payload) {
    sessionStorage.removeItem(CHAT_CREATE_PAYLOAD_KEY);
    void options.sendMessage(payload);
    return;
  }
  void loadConversation(options, runtime, 'hydrate').then(conversation => {
    if (conversation) resumeLoadedConversation(options, runtime, conversation);
  });
  return () => {
    runtime.destroyed = true;
    runtime.resumeFN?.destroy();
  };
}

/** Load, resume, and revalidate a routed conversation with scoped failure handling. */
export default function useConversationBootstrap(
  options: ConversationBootstrapOptions
) {
  const { conversationId, namespaceId, userId } = options;
  useEffect(
    () => startConversationBootstrap(options),
    [namespaceId, conversationId, userId]
  );
}
