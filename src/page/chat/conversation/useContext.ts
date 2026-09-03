import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { FORCE_ASK } from '@/const';
import useApp from '@/hooks/useApp';
import { getWizardLang } from '@/lib/wizardLang';
import {
  AgentRequestChannel,
  ApprovalMode,
  ChatMode,
  SendMessageParams,
} from '@/page/chat/chat-input/types';
import { useChatRouteParams } from '@/page/chat/ChatRouteParamsContext';
import {
  ask,
  extractOriginalMessageSettings,
  findFirstMessageWithMissingParent,
  isTerminalMessageStatus,
  stopStream,
} from '@/page/chat/conversation/utils.ts';
import {
  createMessageOperator,
  MessageOperator,
} from '@/page/chat/core/messageOperator.ts';
import {
  MessageStatus,
  OpenAIMessageRole,
} from '@/page/chat/core/types/chatResponse.ts';
import { MessageDetail } from '@/page/chat/core/types/conversation';
import useGlobalContext from '@/page/chat/useSelectedResources.ts';
import {
  getCopilotWorkspace,
  useCopilotStore,
} from '@/page/copilot/copilotStore';

import {
  type ConversationCacheScope,
  getCurrentUserId,
} from './conversationCache';
import useConversationBootstrap, {
  CHAT_CREATE_PAYLOAD_KEY,
} from './useConversationBootstrap';
import useScopedConversationState from './useScopedConversationState';

export default function useContext() {
  const app = useApp();
  const { i18n } = useTranslation();
  const askAbortRef = useRef<(() => Promise<void>) | null>(null);
  const regeneratingRef = useRef(false);
  const { conversationId, namespaceId } = useChatRouteParams();
  const { resource_id: routeResourceId } = useParams();
  const previewResourceId = useCopilotStore(
    state => getCopilotWorkspace(state, namespaceId).previewResourceId
  );
  const currentResourceId = previewResourceId || routeResourceId;
  const userId = getCurrentUserId();
  const cacheScope = useMemo<ConversationCacheScope>(
    () => ({ userId, namespaceId }),
    [namespaceId, userId]
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [waitingForAssistantDelta, setWaitingForAssistantDelta] =
    useState(false);
  const [regeneratingParentId, setRegeneratingParentId] = useState<
    string | null
  >(null);
  const [initialApprovalMode, setInitialApprovalMode] =
    useState<ApprovalMode>();
  const [suppressInitialToolRestore, setSuppressInitialToolRestore] = useState(
    () =>
      typeof window !== 'undefined' &&
      Boolean(window.sessionStorage.getItem(CHAT_CREATE_PAYLOAD_KEY))
  );
  const { selectedResources, setSelectedResources } = useGlobalContext();
  const [conversation, setConversation] = useScopedConversationState(
    cacheScope,
    conversationId
  );
  const channel = AgentRequestChannel.WEB;
  const messages = useMemo((): MessageDetail[] => {
    if (conversation.id !== conversationId) return [];
    const result: MessageDetail[] = [];
    let currentNode: string | undefined = conversation.current_node;
    while (currentNode) {
      const message = conversation.mapping[currentNode];
      if (!message) {
        break;
      }
      result.unshift(message);
      currentNode = message.parent_id;
    }
    return result;
  }, [conversation, conversationId]);
  const messageOperator = useMemo((): MessageOperator => {
    return createMessageOperator(conversation, setConversation);
  }, [conversation, setConversation]);

  const sendMessage = async ({
    query,
    tools,
    selectedResources,
    mode,
    displayParts,
    decisions,
    recommendedQuestionId,
  }: SendMessageParams) => {
    const v = query.trim();
    if (v || (decisions && decisions.length > 0)) {
      const parentMessageId = messages.at(-1)?.id;
      try {
        if (v) {
          setWaitingForAssistantDelta(true);
        }
        setLoading(true);
        const url = `/api/v1/namespaces/${namespaceId}/wizard/${FORCE_ASK ? 'ask' : mode}`;
        const askFN = ask(
          conversationId,
          v,
          tools,
          selectedResources,
          channel,
          parentMessageId,
          messageOperator,
          url,
          getWizardLang(i18n),
          namespaceId,
          undefined,
          undefined,
          undefined,
          decisions ? { decisions } : undefined,
          displayParts,
          recommendedQuestionId,
          currentResourceId
        );
        askAbortRef.current = askFN.cancel;
        await askFN.start();
      } finally {
        askAbortRef.current = null;
        setWaitingForAssistantDelta(false);
        setLoading(false);
      }
    }
  };

  useConversationBootstrap({
    app,
    askAbortRef,
    cacheScope,
    conversationId,
    messageOperator,
    namespaceId,
    sendMessage,
    setAccessDenied,
    setConversation,
    setInitialApprovalMode,
    setSuppressInitialToolRestore,
    userId,
  });

  const mergedLoading =
    loading || !isTerminalMessageStatus(messages.at(-1)?.status);

  useEffect(() => {
    if (
      waitingForAssistantDelta &&
      messages.some(
        message =>
          message.message.role === OpenAIMessageRole.ASSISTANT &&
          message.status === MessageStatus.STREAMING
      )
    ) {
      setWaitingForAssistantDelta(false);
    }
  }, [messages, waitingForAssistantDelta]);

  const onRegenerate = async (messageId: string) => {
    if (regeneratingRef.current) {
      return;
    }

    const parentId = messageOperator.getParent(messageId);
    const parentMessage = conversation.mapping[parentId];
    if (!parentMessage || !parentMessage.message.content) {
      console.error('Cannot find parent user message to regenerate from');
      return;
    }

    const {
      originalTools,
      originalContext,
      originalLang,
      originalEnableThinking,
    } = extractOriginalMessageSettings(parentMessage);

    regeneratingRef.current = true;
    setRegeneratingParentId(parentId);
    setLoading(true);
    try {
      const askFN = ask(
        conversationId,
        parentMessage.message.content,
        originalTools,
        originalContext,
        channel,
        parentId,
        messageOperator,
        `/api/v1/namespaces/${namespaceId}/wizard/${ChatMode.ASK}`,
        originalLang,
        namespaceId,
        undefined,
        undefined,
        originalEnableThinking,
        undefined,
        undefined,
        undefined,
        currentResourceId
      );
      askAbortRef.current = askFN.cancel;
      await askFN.start();
    } finally {
      askAbortRef.current = null;
      regeneratingRef.current = false;
      setRegeneratingParentId(null);
      setLoading(false);
    }
  };

  const onEdit = async (messageId: string, newContent: string) => {
    const parentId = conversation.mapping[messageId].parent_id;
    const editedMessage = conversation.mapping[messageId];

    const {
      originalTools,
      originalContext,
      originalLang,
      originalEnableThinking,
    } = extractOriginalMessageSettings(editedMessage);

    setLoading(true);
    try {
      const askFN = ask(
        conversationId,
        newContent,
        originalTools,
        originalContext,
        channel,
        parentId,
        messageOperator,
        `/api/v1/namespaces/${namespaceId}/wizard/${ChatMode.ASK}`,
        originalLang,
        namespaceId,
        undefined,
        undefined,
        originalEnableThinking,
        undefined,
        undefined,
        undefined,
        currentResourceId
      );
      askAbortRef.current = askFN.cancel;
      await askFN.start();
    } finally {
      askAbortRef.current = null;
      setLoading(false);
    }
  };

  const onStop = async () => {
    const cancel = askAbortRef.current;
    askAbortRef.current = null;
    await stopStream({
      cancel,
      cancelUrl: `/namespaces/${namespaceId}/wizard/stream/cancel`,
      conversationId,
      messageOperator,
      setLoading,
    });
  };

  const firstUserMessage = findFirstMessageWithMissingParent(messages);

  useEffect(() => {
    // Only request title generation for untitled conversations. Copilot history
    // loads otherwise cache chat:title and break chat-home Header (empty id).
    if (
      !conversationId ||
      !firstUserMessage?.message.content ||
      conversation.title
    ) {
      return;
    }
    app.fire('chat:title', {
      conversationId,
      text: firstUserMessage.message.content,
    });
  }, [
    app,
    conversation.title,
    conversationId,
    firstUserMessage?.message.content,
  ]);

  return {
    loading: mergedLoading,
    accessDenied,
    waitingForAssistantDelta,
    regeneratingParentId,
    sendMessage,
    messages,
    selectedResources,
    setSelectedResources,
    initialApprovalMode,
    suppressInitialToolRestore,
    namespaceId,
    conversation,
    messageOperator,
    onRegenerate,
    onEdit,
    onStop,
  };
}
