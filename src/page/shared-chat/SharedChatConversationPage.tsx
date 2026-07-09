import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { http } from '@/lib/request';
import { setDocumentTitle } from '@/lib/utils';
import { getWizardLang } from '@/lib/wizardLang';
import ChatArea from '@/page/chat/chat-input';
import {
  AgentRequestChannel,
  ApprovalMode,
  ChatCreatePayload,
  SendMessageParams,
} from '@/page/chat/chat-input/types';
import Scrollbar from '@/page/chat/conversation/Scrollbar';
import {
  ask,
  extractOriginalMessageSettings,
  getStreamEventId,
  isTerminalMessageStatus,
  resumeStream,
  stopStream,
} from '@/page/chat/conversation/utils.ts';
import { createMessageOperator } from '@/page/chat/core/messageOperator.ts';
import {
  MessageStatus,
  OpenAIMessageRole,
} from '@/page/chat/core/types/chatResponse.ts';
import {
  ConversationDetail,
  MessageDetail,
} from '@/page/chat/core/types/conversation';
import { Messages } from '@/page/chat/messages';
import { MessageIndex } from '@/page/chat/messages/MessageIndex';
import { useShareContext } from '@/page/share';

export default function SharedChatConversationPage() {
  const params = useParams();
  const shareId = params.share_id || '';
  const conversationId = params.conversation_id || '';
  const askAbortRef = useRef<(() => Promise<void>) | null>(null);
  const regeneratingRef = useRef(false);
  const { selectedResources, setSelectedResources, mode, password } =
    useShareContext();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState<boolean>(false);
  const [waitingForAssistantDelta, setWaitingForAssistantDelta] =
    useState(false);
  const [regeneratingParentId, setRegeneratingParentId] = useState<
    string | null
  >(null);
  const [initialApprovalMode, setInitialApprovalMode] =
    useState<ApprovalMode>();
  const channel = AgentRequestChannel.WEB_SHARE;
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
        if (v) {
          setWaitingForAssistantDelta(true);
        }
        setLoading(true);
        const askFN = ask(
          conversationId,
          v,
          tools,
          selectedResources,
          channel,
          messages[messages.length - 1]?.id,
          messageOperator,
          `/api/v1/shares/${shareId}/wizard/${mode}`,
          getWizardLang(i18n),
          undefined,
          shareId,
          password || undefined,
          undefined,
          decisions ? { decisions } : undefined
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
        `/api/v1/shares/${shareId}/wizard/${mode}`,
        originalLang,
        undefined,
        shareId,
        password || undefined,
        originalEnableThinking
      );
      askAbortRef.current = askFN.cancel;
      await askFN.start();
    } finally {
      askAbortRef.current = null;
      setLoading(false);
    }
  };

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
        `/api/v1/shares/${shareId}/wizard/${mode}`,
        originalLang,
        undefined,
        shareId,
        password || undefined,
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

  useEffect(() => {
    setDocumentTitle(t('chat.title'));
  }, [t]);

  useEffect(() => {
    if (!conversationId) return;
    const state = sessionStorage.getItem('shared-chat-create-payload');
    const chatCreatePayload: ChatCreatePayload = state
      ? JSON.parse(state)
      : null;
    setInitialApprovalMode(chatCreatePayload?.approvalMode);
    const loadConversation = () =>
      http
        .get(`/shares/${shareId}/conversations/${conversationId}`)
        .then((response: ConversationDetail) => {
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
          `/api/v1/shares/${shareId}/wizard/stream/resume`,
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
    sessionStorage.removeItem('shared-chat-create-payload');
    void sendMessage(chatCreatePayload);
  }, [shareId, conversationId]);

  const onStop = async () => {
    const cancel = askAbortRef.current;
    askAbortRef.current = null;
    await stopStream({
      cancel,
      cancelUrl: `/shares/${shareId}/wizard/stream/cancel`,
      conversationId,
      messageOperator,
      setLoading,
    });
  };

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

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <Scrollbar>
        <MessageIndex messages={messages} />
        <Messages
          messages={messages}
          conversation={conversation}
          messageOperator={messageOperator}
          onRegenerate={onRegenerate}
          onEdit={onEdit}
          regeneratingParentId={regeneratingParentId}
        />
      </Scrollbar>
      <div className="flex justify-center px-4">
        <div className="flex-1 max-w-3xl w-full">
          <ChatArea
            messages={messages}
            navigatePrefix={`/s/${shareId}`}
            initialApprovalMode={initialApprovalMode}
            approvalModeResetKey={conversation.id}
            selectedResources={selectedResources}
            setSelectedResources={setSelectedResources}
            loading={mergedLoading}
            waitingForAssistantDelta={waitingForAssistantDelta}
            sendMessage={sendMessage}
            onStop={onStop}
          />
          <div className="text-center text-xs pt-2 text-muted-foreground truncate">
            {t('chat.disclaimer')}
          </div>
        </div>
      </div>
    </div>
  );
}
