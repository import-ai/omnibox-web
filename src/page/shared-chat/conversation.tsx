import { isFunction } from 'lodash-es';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { http } from '@/lib/request';
import { setDocumentTitle } from '@/lib/utils';
import { getWizardLang } from '@/lib/wizard-lang';
import ChatArea from '@/page/chat/chat-input';
import { InputMode } from '@/page/chat/chat-input/types';
import Scrollbar from '@/page/chat/conversation/scrollbar';
import {
  ask,
  extractOriginalMessageSettings,
} from '@/page/chat/conversation/utils.ts';
import { createMessageOperator } from '@/page/chat/core/message-operator.ts';
import {
  ConversationDetail,
  MessageDetail,
} from '@/page/chat/core/types/conversation';
import { Messages } from '@/page/chat/messages';
import { useShareContext } from '@/page/share';

export default function SharedChatConversationPage() {
  const params = useParams();
  const shareId = params.share_id || '';
  const conversationId = params.conversation_id || '';
  const askAbortRef = useRef<() => void>(null);
  const {
    selectedResources,
    setSelectedResources,
    mode,
    setMode,
    tools,
    setTools,
    password,
  } = useShareContext();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState<boolean>(false);
  const [conversation, setConversation] = useState<ConversationDetail>({
    id: conversationId,
    mapping: {},
  });
  const messageOperator = useMemo(
    () => createMessageOperator(conversation, setConversation),
    [conversation, setConversation]
  );

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

  const callbacks = {
    sendMessage: async (query: string) => {
      const v = query.trim();
      if (v) {
        await submit(v);
      }
    },
    stopStreaming: () => {
      isFunction(askAbortRef.current) && askAbortRef.current();
      setLoading(false);
    },
  };

  const submit = async (query?: string) => {
    if (!query || query.trim().length === 0) {
      return;
    }
    setLoading(true);
    try {
      const askFN = ask(
        conversationId,
        query,
        tools,
        selectedResources,
        messages[messages.length - 1]?.id,
        messageOperator,
        `/api/v1/shares/${shareId}/wizard/${mode}`,
        getWizardLang(i18n),
        undefined,
        shareId,
        password || undefined
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
    } = extractOriginalMessageSettings(editedMessage, {
      tools,
      context: selectedResources,
      lang: getWizardLang(i18n),
    });

    setLoading(true);
    try {
      const askFN = ask(
        conversationId,
        newContent,
        originalTools,
        originalContext,
        parentId,
        messageOperator,
        `/api/v1/shares/${shareId}/wizard/${mode}`,
        originalLang,
        undefined,
        shareId,
        password || undefined,
        originalEnableThinking
      );
      askAbortRef.current = askFN.destroy;
      await askFN.start();
    } finally {
      setLoading(false);
    }
  };

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
    } = extractOriginalMessageSettings(parentMessage, {
      tools,
      context: selectedResources,
      lang: getWizardLang(i18n),
    });

    setLoading(true);
    try {
      const askFN = ask(
        conversationId,
        parentMessage.message.content,
        originalTools,
        originalContext,
        parentId,
        messageOperator,
        `/api/v1/shares/${shareId}/wizard/${mode}`,
        originalLang,
        undefined,
        shareId,
        password || undefined,
        originalEnableThinking
      );
      askAbortRef.current = askFN.destroy;
      await askFN.start();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setDocumentTitle(t('chat.title'));
  }, [t]);

  useEffect(() => {
    if (!conversationId) return;
    const state = sessionStorage.getItem('shared-chat-state');
    const parsed = state ? JSON.parse(state) : null;
    const query = parsed?.query;
    sessionStorage.removeItem('shared-chat-state');
    http
      .get(`/shares/${shareId}/conversations/${conversationId}`)
      .then(response => {
        setConversation(response);
        if (query) {
          submit(query);
        }
      });
  }, [shareId, conversationId]);

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <Scrollbar>
        <Messages
          messages={messages}
          conversation={conversation}
          messageOperator={messageOperator}
          onRegenerate={onRegenerate}
          onEdit={onEdit}
        />
      </Scrollbar>
      <div className="flex justify-center px-4">
        <div className="flex-1 max-w-3xl w-full">
          <ChatArea
            mode={mode}
            tools={tools}
            setMode={setMode}
            loading={loading}
            context={selectedResources}
            inputMode={InputMode.TEXT}
            pendingInterrupts={[]}
            callbacks={callbacks}
            onToolsChange={setTools}
            onContextChange={setSelectedResources}
            onDecision={() => {}}
            navigatePrefix={`/s/${shareId}`}
          />
          <div className="text-center text-xs pt-2 text-muted-foreground truncate">
            {t('chat.disclaimer')}
          </div>
        </div>
      </div>
    </div>
  );
}
