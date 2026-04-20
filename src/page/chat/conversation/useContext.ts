import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { FORCE_ASK } from '@/const';
import useApp from '@/hooks/use-app';
import { http } from '@/lib/request';
import { getWizardLang } from '@/lib/wizard-lang';
import {
  ChatCreatePayload,
  ChatMode,
  SendMessageParams,
} from '@/page/chat/chat-input/types';
import {
  ask,
  extractOriginalMessageSettings,
  findFirstMessageWithMissingParent,
} from '@/page/chat/conversation/utils.ts';
import {
  createMessageOperator,
  MessageOperator,
} from '@/page/chat/core/message-operator.ts';
import { MessageStatus } from '@/page/chat/core/types/chat-response.ts';
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
  const askAbortRef = useRef<() => void>(null);
  const namespaceId = params.namespace_id || '';
  const conversationId = params.conversation_id || '';
  const [loading, setLoading] = useState<boolean>(false);
  const { selectedResources, setSelectedResources } = useGlobalContext();
  const [conversation, setConversation] = useState<ConversationDetail>({
    id: conversationId,
    mapping: {},
  });
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
  }: SendMessageParams) => {
    const v = query.trim();
    if (v || (decisions && decisions.length > 0)) {
      try {
        setLoading(true);
        const url = `/api/v1/namespaces/${namespaceId}/wizard/${FORCE_ASK ? 'ask' : mode}`;
        const askFN = ask(
          conversationId,
          v,
          tools,
          selectedResources,
          messages.at(-1)?.id,
          messageOperator,
          url,
          getWizardLang(i18n),
          namespaceId,
          undefined,
          undefined,
          undefined,
          decisions ? { decisions } : undefined
        );
        askAbortRef.current = askFN.destroy;
        await askFN.start();
      } finally {
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
    if (!chatCreatePayload) {
      http
        .get(`/namespaces/${namespaceId}/conversations/${conversationId}`)
        .then(response => {
          const conversationTitle = getTitleFromConversationDetail(response);
          if (conversationTitle) {
            app.fire('chat:title:update', conversationTitle);
          }
          setConversation(response);
        });
      return;
    }
    sessionStorage.removeItem('chat-create-payload');
    void sendMessage(chatCreatePayload);
  }, [namespaceId, conversationId]);

  const mergedLoading =
    ![MessageStatus.FAILED, MessageStatus.SUCCESS].includes(
      messages.at(-1)?.status ?? MessageStatus.PENDING
    ) || loading;

  const onRegenerate = async (messageId: string) => {
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

    setLoading(true);
    try {
      const askFN = ask(
        conversationId,
        parentMessage.message.content,
        originalTools,
        originalContext,
        parentId,
        messageOperator,
        `/api/v1/namespaces/${namespaceId}/wizard/${ChatMode.ASK}`,
        originalLang,
        namespaceId,
        undefined,
        undefined,
        originalEnableThinking
      );
      askAbortRef.current = askFN.destroy;
      await askFN.start();
    } finally {
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
        parentId,
        messageOperator,
        `/api/v1/namespaces/${namespaceId}/wizard/${ChatMode.ASK}`,
        originalLang,
        namespaceId,
        undefined,
        undefined,
        originalEnableThinking
      );
      askAbortRef.current = askFN.destroy;
      await askFN.start();
    } finally {
      setLoading(false);
    }
  };

  const firstUserMessage = findFirstMessageWithMissingParent(messages);

  useEffect(() => {
    if (firstUserMessage?.message.content) {
      app.fire('chat:title', firstUserMessage.message.content);
    }
  }, [firstUserMessage?.message.content, app]);

  return {
    loading: mergedLoading,
    sendMessage,
    messages,
    selectedResources,
    setSelectedResources,
    namespaceId,
    conversation,
    messageOperator,
    onRegenerate,
    onEdit,
  };
}
