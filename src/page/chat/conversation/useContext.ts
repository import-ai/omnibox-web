import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { FORCE_ASK } from '@/const';
import useApp from '@/hooks/useApp';
import { http } from '@/lib/request';
import { getWizardLang } from '@/lib/wizardLang';
import {
  AgentRequestChannel,
  ApprovalMode,
  ChatCreatePayload,
  ChatMode,
  SendMessageParams,
} from '@/page/chat/chat-input/types';
import {
  ask,
  extractOriginalMessageSettings,
  findFirstMessageWithMissingParent,
  getStreamEventId,
  isTerminalMessageStatus,
  resumeStream,
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
import {
  ConversationDetail,
  MessageDetail,
} from '@/page/chat/core/types/conversation';
import useGlobalContext from '@/page/chat/useSelectedResources.ts';

import { getTitleFromConversationDetail } from '../utils';

export default function useContext() {
  const app = useApp();
  const params = useParams();
  const { i18n } = useTranslation();
  const askAbortRef = useRef<(() => Promise<void>) | null>(null);
  const regeneratingRef = useRef(false);
  const namespaceId = params.namespace_id || '';
  const conversationId = params.conversation_id || '';
  const [loading, setLoading] = useState<boolean>(false);
  const [waitingForAssistantDelta, setWaitingForAssistantDelta] =
    useState(false);
  const [regeneratingParentId, setRegeneratingParentId] = useState<
    string | null
  >(null);
  const [initialApprovalMode, setInitialApprovalMode] =
    useState<ApprovalMode>();
  const { selectedResources, setSelectedResources } = useGlobalContext();
  const [conversation, setConversation] = useState<ConversationDetail>({
    id: conversationId,
    mapping: {},
  });
  const channel = AgentRequestChannel.WEB;
  const messages = useMemo((): MessageDetail[] => {
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
  }, [conversation]);
  const messageOperator = useMemo((): MessageOperator => {
    return createMessageOperator(conversation, setConversation);
  }, [conversation, setConversation]);

  const sendMessage = async ({
    query,
    tools,
    selectedResources,
    mode,
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
          recommendedQuestionId
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

  useEffect(() => {
    if (!conversationId) return;
    const state = sessionStorage.getItem('chat-create-payload');
    const chatCreatePayload: ChatCreatePayload | undefined = state
      ? JSON.parse(state)
      : undefined;
    setInitialApprovalMode(chatCreatePayload?.approvalMode);
    const loadConversation = () =>
      http
        .get(`/namespaces/${namespaceId}/conversations/${conversationId}`)
        .then((response: ConversationDetail) => {
          const conversationTitle = getTitleFromConversationDetail(response);
          if (conversationTitle) {
            app.fire('chat:title:update', conversationTitle);
          }
          setConversation(response);
          return response;
        });

    if (!chatCreatePayload) {
      let destroyed = false;
      let resumeFN: ReturnType<typeof resumeStream> | undefined;
      void loadConversation().then(conversation => {
        if (destroyed) return;
        resumeFN = resumeStream(
          conversationId,
          messageOperator,
          `/api/v1/namespaces/${namespaceId}/wizard/stream/resume`,
          getStreamEventId(conversation)
        );
        askAbortRef.current = resumeFN.cancel;
        void resumeFN.start().finally(() => {
          if (askAbortRef.current === resumeFN?.cancel) {
            askAbortRef.current = null;
          }
          void loadConversation();
        });
      });
      return () => {
        destroyed = true;
        resumeFN?.destroy();
      };
    }
    sessionStorage.removeItem('chat-create-payload');
    void sendMessage(chatCreatePayload);
  }, [namespaceId, conversationId]);

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
        originalEnableThinking
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
        originalEnableThinking
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
    if (firstUserMessage?.message.content) {
      app.fire('chat:title', firstUserMessage.message.content);
    }
  }, [firstUserMessage?.message.content, app]);

  return {
    loading: mergedLoading,
    waitingForAssistantDelta,
    regeneratingParentId,
    sendMessage,
    messages,
    selectedResources,
    setSelectedResources,
    initialApprovalMode,
    namespaceId,
    conversation,
    messageOperator,
    onRegenerate,
    onEdit,
    onStop,
  };
}
