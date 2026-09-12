import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { ConversationDetail } from '@/page/chat/core/types/conversation';

import {
  type ConversationCacheScope,
  getCachedConversation,
  getCurrentUserId,
  hasConversationContent,
  setCachedConversation,
} from './conversationCache';

interface ScopedConversationState {
  key: string;
  conversation: ConversationDetail;
}

function createEmptyConversation(conversationId: string): ConversationDetail {
  return { id: conversationId, mapping: {} };
}

function getStateKey(scope: ConversationCacheScope, conversationId: string) {
  return JSON.stringify([scope.userId, scope.namespaceId, conversationId]);
}

/** Keep React conversation state synchronized with its authenticated cache scope. */
export default function useScopedConversationState(
  scope: ConversationCacheScope,
  conversationId: string
): [ConversationDetail, Dispatch<SetStateAction<ConversationDetail>>] {
  const stateKey = getStateKey(scope, conversationId);
  const scopedFallback = useMemo(
    () =>
      getCachedConversation(scope, conversationId) ??
      createEmptyConversation(conversationId),
    [conversationId, scope]
  );
  const [state, setState] = useState<ScopedConversationState>(() => ({
    key: stateKey,
    conversation: scopedFallback,
  }));
  const conversation =
    state.key === stateKey ? state.conversation : scopedFallback;

  useEffect(() => {
    setState(previousState => {
      if (
        previousState.key === stateKey &&
        Object.keys(previousState.conversation.mapping).length > 0
      ) {
        return previousState;
      }
      return { key: stateKey, conversation: scopedFallback };
    });
  }, [scopedFallback, stateKey]);

  useEffect(() => {
    if (
      conversation.id !== conversationId ||
      getCurrentUserId() !== scope.userId ||
      !hasConversationContent(conversation)
    ) {
      return;
    }
    setCachedConversation(scope, conversation);
  }, [conversation, conversationId, scope]);

  const setConversation = useCallback<
    Dispatch<SetStateAction<ConversationDetail>>
  >(
    action => {
      setState(previousState => {
        const previousConversation =
          previousState.key === stateKey
            ? previousState.conversation
            : scopedFallback;
        const nextConversation =
          typeof action === 'function' ? action(previousConversation) : action;
        return { key: stateKey, conversation: nextConversation };
      });
    },
    [scopedFallback, stateKey]
  );

  return [conversation, setConversation];
}
