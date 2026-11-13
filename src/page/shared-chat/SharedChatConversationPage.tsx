import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { ShareResourcePicker } from '@/components/resourcePicker';
import { Marker, MarkerContent, MarkerIcon } from '@/components/ui/Marker';
import { Spinner } from '@/components/ui/Spinner';
import { reportChatError } from '@/lib/chatErrorTracking';
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
import { mergeHistoryPage } from '@/page/chat/conversation/conversationHistory';
import Scrollbar from '@/page/chat/conversation/Scrollbar';
import useChatStreamRecovery from '@/page/chat/conversation/useChatStreamRecovery';
import {
  ask,
  extractOriginalMessageSettings,
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

const SHARED_CHAT_CREATE_PAYLOAD_KEY = 'shared-chat-create-payload';

export default function SharedChatConversationPage() {
  const params = useParams();
  const shareId = params.share_id || '';
  const conversationId = params.conversation_id || '';
  const askAbortRef = useRef<(() => Promise<void>) | null>(null);
  const detachStreamRef = useRef<(() => void) | null>(null);
  const regeneratingRef = useRef(false);
  const { shareInfo, selectedResources, setSelectedResources, mode, password } =
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
  const [suppressInitialToolRestore, setSuppressInitialToolRestore] = useState(
    () =>
      typeof window !== 'undefined' &&
      Boolean(window.sessionStorage.getItem(SHARED_CHAT_CREATE_PAYLOAD_KEY))
  );
  const channel = AgentRequestChannel.WEB_SHARE;
  const [conversation, setConversation] = useState<ConversationDetail>({
    id: conversationId,
    mapping: {},
  });
  const conversationRef = useRef(conversation);
  conversationRef.current = conversation;
  const recoveryResetRef = useRef<(() => void) | null>(null);
  const messageOperator = useMemo(() => {
    const operator = createMessageOperator(conversation, setConversation);
    return {
      ...operator,
      activate: (id: string) => {
        recoveryResetRef.current?.();
        operator.activate(id);
      },
    };
  }, [conversation, setConversation]);

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

  const recovery = useChatStreamRecovery({
    conversationId,
    scopeKey: shareId,
    conversationRef,
    setConversation,
    messageOperator,
    askAbortRef,
    detachStreamRef,
    // The share endpoint always returns the whole conversation; the branch
    // params are accepted here for parity with the private conversation API.
    onUnavailable: () => setConversation({ id: conversationId, mapping: {} }),
    loadSnapshot: query =>
      http.get(`/shares/${shareId}/conversations/${conversationId}`, {
        params: query,
        mute: true,
      }),
    createResumeStream: (lastEventId, onOpen) =>
      resumeStream(
        conversationId,
        messageOperator,
        `/api/v1/shares/${shareId}/wizard/stream/resume`,
        lastEventId,
        { channel: 'web_share', shareId },
        onOpen
      ),
  });
  recoveryResetRef.current = recovery.reset;
  const recover = recovery.recover;

  const sendMessage = async ({
    query,
    edition,
    level,
    tools,
    selectedResources,
    mode,
    displayParts,
    decisions,
  }: SendMessageParams) => {
    const v = query.trim();
    if (v || (decisions && decisions.length > 0)) {
      let askFN: ReturnType<typeof ask> | undefined;
      try {
        if (v) {
          setWaitingForAssistantDelta(true);
        }
        setLoading(true);
        askFN = ask(
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
          decisions ? { decisions } : undefined,
          displayParts,
          undefined,
          undefined,
          undefined,
          undefined,
          edition,
          level
        );
        recovery.reset();
        recovery.track(askFN);
        askAbortRef.current = askFN.cancel;
        detachStreamRef.current = askFN.destroy;
        await askFN.start();
        if (askFN.outcome?.transientError) {
          void recovery.recover({
            pendingRequestId: askFN.outcome?.acceptedMessageId
              ? undefined
              : askFN.outcome?.requestId,
            cursor: askFN.getLastEventId?.(),
          });
        }
      } finally {
        if (askFN) recovery.untrack(askFN);
        if (!askFN || askAbortRef.current === askFN.cancel)
          askAbortRef.current = null;
        if (askFN && detachStreamRef.current === askFN.destroy)
          detachStreamRef.current = null;
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
    let askFN: ReturnType<typeof ask> | undefined;
    try {
      askFN = ask(
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
        originalEnableThinking,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        editedMessage.attrs?.edition,
        editedMessage.attrs?.level
      );
      recovery.reset();
      recovery.track(askFN);
      askAbortRef.current = askFN.cancel;
      detachStreamRef.current = askFN.destroy;
      await askFN.start();
      if (askFN.outcome?.transientError) {
        void recovery.recover({
          pendingRequestId: askFN.outcome?.acceptedMessageId
            ? undefined
            : askFN.outcome?.requestId,
          cursor: askFN.getLastEventId?.(),
        });
      }
    } finally {
      if (askFN) recovery.untrack(askFN);
      if (!askFN || askAbortRef.current === askFN.cancel)
        askAbortRef.current = null;
      if (askFN && detachStreamRef.current === askFN.destroy)
        detachStreamRef.current = null;
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
    let askFN: ReturnType<typeof ask> | undefined;
    try {
      askFN = ask(
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
        originalEnableThinking,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        parentMessage.attrs?.edition,
        parentMessage.attrs?.level
      );
      recovery.reset();
      recovery.track(askFN);
      askAbortRef.current = askFN.cancel;
      detachStreamRef.current = askFN.destroy;
      await askFN.start();
      if (askFN.outcome?.transientError) {
        void recovery.recover({ cursor: askFN.getLastEventId?.() });
      }
    } finally {
      if (askFN) recovery.untrack(askFN);
      if (!askFN || askAbortRef.current === askFN.cancel)
        askAbortRef.current = null;
      if (askFN && detachStreamRef.current === askFN.destroy)
        detachStreamRef.current = null;
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
    const state = sessionStorage.getItem(SHARED_CHAT_CREATE_PAYLOAD_KEY);
    const chatCreatePayload: ChatCreatePayload = state
      ? JSON.parse(state)
      : null;
    setInitialApprovalMode(chatCreatePayload?.approvalMode);
    setSuppressInitialToolRestore(Boolean(chatCreatePayload));
    let destroyed = false;
    const loadConversation = () =>
      http
        .get(`/shares/${shareId}/conversations/${conversationId}`)
        .then((response: ConversationDetail) => {
          if (destroyed) return response;
          setConversation(previous =>
            previous.id === response.id
              ? mergeHistoryPage(previous, response)
              : response
          );
          return response;
        })
        .catch(error => {
          reportChatError(error, {
            conversationId,
            channel: 'web_share',
            stage: 'history',
            shareId,
            clientState: 'loading_history',
          });
          throw error;
        });

    if (!chatCreatePayload) {
      void loadConversation().then(conversation => {
        if (destroyed) return;
        void recover({ initialConversation: conversation });
      });
      return () => {
        destroyed = true;
        detachStreamRef.current?.();
      };
    }
    sessionStorage.removeItem(SHARED_CHAT_CREATE_PAYLOAD_KEY);
    void sendMessage(chatCreatePayload);
  }, [shareId, conversationId, recover]);

  const onStop = async () => {
    const cancel = askAbortRef.current;
    askAbortRef.current = null;
    try {
      await stopStream({
        cancel,
        cancelUrl: `/shares/${shareId}/wizard/stream/cancel`,
        conversationId,
        messageId: messages.at(-1)?.id,
        messageOperator,
        setLoading,
      });
      recovery.stop();
    } catch (error) {
      reportChatError(error, {
        conversationId,
        channel: 'web_share',
        stage: 'transport',
        shareId,
        clientState: 'stopping',
      });
      toast.error(t('chat.stop_failed'));
      void recovery.recover({ force: true });
    }
  };

  const mergedLoading =
    loading ||
    recovery.streamState === 'recovering' ||
    !isTerminalMessageStatus(messages.at(-1)?.status);

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
      <Scrollbar
        resetKey={conversation.id}
        sideContent={<MessageIndex messages={messages} />}
      >
        <Messages
          messages={messages}
          conversation={conversation}
          messageOperator={messageOperator}
          onRegenerate={onRegenerate}
          onEdit={onEdit}
          regeneratingParentId={regeneratingParentId}
        />
        {(recovery.streamState === 'recovering' ||
          recovery.streamState === 'offline') && (
          <Marker role="status" className="mt-4">
            <MarkerIcon>
              <Spinner />
            </MarkerIcon>
            <MarkerContent
              className={
                recovery.streamState === 'recovering' ? 'shimmer' : undefined
              }
            >
              {t(`chat.stream.${recovery.streamState}`)}
            </MarkerContent>
          </Marker>
        )}
      </Scrollbar>
      <div
        className="relative z-20 flex shrink-0 justify-center bg-background px-4 pb-[max(8px,env(safe-area-inset-bottom))]"
        data-chat-composer
      >
        <div className="flex-1 max-w-3xl w-full">
          <ChatArea
            imageUploadDisabled
            imageUploadDisabledReason={t('chat.image.share_unsupported')}
            key={conversation.id}
            composerSurface="conversation"
            messages={messages}
            navigatePrefix={`/s/${shareId}`}
            initialApprovalMode={initialApprovalMode}
            approvalModeResetKey={conversation.id}
            suppressInitialToolRestore={suppressInitialToolRestore}
            selectedResources={selectedResources}
            setSelectedResources={setSelectedResources}
            renderResourcePicker={
              shareInfo &&
              shareInfo.resource &&
              shareInfo.share_type !== 'chat_only'
                ? onSelect => (
                    <ShareResourcePicker
                      shareId={shareId}
                      rootResource={shareInfo.resource!}
                      canBrowseResources={shareInfo.all_resources}
                      onSelect={resource => onSelect(resource)}
                    />
                  )
                : undefined
            }
            loading={mergedLoading}
            waitingForAssistantDelta={waitingForAssistantDelta}
            streamState={recovery.streamState}
            sendMessage={sendMessage}
            onStop={onStop}
          />
          <div
            data-chat-disclaimer
            className="pt-2 text-center text-xs leading-5 text-muted-foreground"
          >
            {t('chat.disclaimer')}
          </div>
        </div>
      </div>
    </div>
  );
}
