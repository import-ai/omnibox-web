import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

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
  type PendingDecision,
  sendRejectingPending,
  type SendTurnOutcome,
} from '@/page/chat/conversation/pendingDecisionSend';
import {
  resolveConversationImages,
  withUploadedImageParts,
} from '@/page/chat/conversation/uploadConversationImages';
import {
  ask,
  beginPendingQuery,
  extractOriginalMessageSettings,
  findFirstMessageWithMissingParent,
  isTerminalMessageStatus,
  stopStream,
} from '@/page/chat/conversation/utils.ts';
import {
  clearProvisionalConversation,
  messagePreviewTitle,
  provisionalTitleForSend,
  rememberProvisionalConversation,
} from '@/page/chat/conversations/provisionalConversation';
import {
  createMessageOperator,
  MessageOperator,
} from '@/page/chat/core/messageOperator.ts';
import {
  MessageStatus,
  OpenAIMessageRole,
} from '@/page/chat/core/types/chatResponse.ts';
import { MessageDetail } from '@/page/chat/core/types/conversation';
import { getUserMessageImages } from '@/page/chat/messages/role/userMessageTokens';
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
import useConversationHistory, {
  type LatestMessage,
} from './useConversationHistory';
import useScopedConversationState from './useScopedConversationState';

// A message the server never accepted keeps its client request ID as its ID.
function isLocalMessage(message: MessageDetail | undefined) {
  return Boolean(message && message.attrs?.client_request_id === message.id);
}

function isQuestion(message: LatestMessage) {
  return message.role === OpenAIMessageRole.USER && !message.decisions.length;
}

// Where a new question continues from the newest message of the branch. A
// user message is never its parent: the server would take the new question as
// a retry of that message.
function continuationOf(leaf: LatestMessage | undefined): {
  leafId?: string;
  pending?: PendingDecision;
} {
  if (!leaf) return {};
  if (leaf.interrupts.length)
    return {
      leafId: leaf.id,
      pending: { messageId: leaf.id, count: leaf.interrupts.length },
    };
  // A decision the server accepted but never applied (no tool result): send
  // it again under itself; the server reuses it and produces the results.
  if (leaf.role === OpenAIMessageRole.USER && leaf.decisions.length)
    return {
      leafId: leaf.id,
      pending: { messageId: leaf.id, count: leaf.decisions.length },
    };
  // A question whose reply never came: ask beside it.
  if (leaf.role === OpenAIMessageRole.USER) return { leafId: leaf.parentId };
  return { leafId: leaf.id };
}

function lastServerMessage(messages: MessageDetail[]) {
  return [...messages].reverse().find(message => !isLocalMessage(message));
}

function serverAncestorId(
  conversation: { mapping: Record<string, MessageDetail> },
  id: string | undefined
) {
  let current = id;
  while (current && isLocalMessage(conversation.mapping[current]))
    current = conversation.mapping[current].parent_id;
  return current;
}

export default function useContext() {
  const app = useApp();
  const { i18n } = useTranslation();
  const askAbortRef = useRef<(() => Promise<void>) | null>(null);
  const detachStreamRef = useRef<(() => void) | null>(null);
  const detachActiveStream = useCallback(() => {
    detachStreamRef.current?.();
    detachStreamRef.current = null;
  }, []);
  const regeneratingRef = useRef(false);
  // Set while a typed message first rejects a pending decision.
  const rejectPhaseRef = useRef<{ rejecting: boolean; stopped: boolean }>(null);
  const uploadRetries = useRef(new Map<string, () => Promise<void>>());
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
  const conversationRef = useRef(conversation);
  conversationRef.current = conversation;
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
  const history = useConversationHistory(
    namespaceId,
    userId,
    conversation,
    setConversation
  );
  const messageOperator = useMemo((): MessageOperator => {
    return {
      ...createMessageOperator(conversation, setConversation),
      activate: (id: string) => {
        void history.activateBranch(id);
      },
    };
  }, [conversation, setConversation, history.activateBranch]);

  const sendTurn = async (
    params: SendMessageParams,
    parentMessageId: string | undefined,
    {
      retryId,
      deferPendingInterrupt = false,
    }: { retryId?: string; deferPendingInterrupt?: boolean } = {}
  ): Promise<SendTurnOutcome | undefined> => {
    const {
      query,
      tools,
      selectedResources,
      mode,
      displayParts,
      decisions,
      recommendedQuestionId,
      images,
      edition,
      level,
    } = params;
    const v = query.trim();
    if (v || (decisions && decisions.length > 0)) {
      const provisionalTitle = v
        ? provisionalTitleForSend({
            query: v,
            conversationTitle: conversation.title,
            hasEarlierUserMessage: messages.some(
              message =>
                message.id !== retryId &&
                message.message.role === OpenAIMessageRole.USER &&
                Boolean(message.message.content?.trim())
            ),
          })
        : null;
      if (provisionalTitle) {
        const scope = { userId: getCurrentUserId(), namespaceId };
        const provisional = {
          id: conversationId,
          title: provisionalTitle,
          created_at: conversation.created_at || new Date().toISOString(),
        };
        rememberProvisionalConversation(scope, provisional);
        app.fire('chat:conversation:provisional', {
          userId: scope.userId,
          namespaceId,
          conversation: provisional,
        });
      }
      const pendingId = beginPendingQuery(
        messageOperator,
        v,
        parentMessageId,
        {
          composer: displayParts ? { display_parts: displayParts } : undefined,
          tool_call: decisions ? { decisions, status: 'pending' } : undefined,
          // Kept on the local message so sending it again keeps the strength.
          edition,
          level,
        },
        retryId
      );
      uploadRetries.current.set(pendingId, async () => {
        await sendTurn(params, parentMessageId, { retryId: pendingId });
      });
      let askFN: ReturnType<typeof ask> | undefined;
      let uploadedImages: Awaited<
        ReturnType<typeof resolveConversationImages>
      > = [];
      try {
        if (v) {
          setWaitingForAssistantDelta(true);
        }
        setLoading(true);
        uploadedImages = await resolveConversationImages(
          namespaceId,
          conversationId,
          images
        );
        uploadRetries.current.delete(pendingId);
        params.onImagesUploaded?.();
        const url = `/api/v1/namespaces/${namespaceId}/wizard/${FORCE_ASK ? 'ask' : mode}`;
        askFN = ask(
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
          withUploadedImageParts(displayParts, uploadedImages),
          recommendedQuestionId,
          currentResourceId,
          uploadedImages,
          pendingId,
          edition,
          level,
          {
            deferPendingInterrupt,
            reportAlreadyDecided: true,
            // A new question continues from the newest message once any
            // running reply finished; edits and retries keep their parent.
            followLatest: !decisions?.length && !retryId,
            onReparented: parentId => {
              void history.mergeBranch(parentId).catch(() => undefined);
            },
          }
        );
        askAbortRef.current = askFN.cancel;
        detachStreamRef.current = askFN.destroy;
        await askFN.start();
      } catch (error) {
        if (provisionalTitle) {
          const scope = { userId: getCurrentUserId(), namespaceId };
          clearProvisionalConversation(scope, conversationId);
          app.fire('chat:conversation:provisional', {
            userId: scope.userId,
            namespaceId,
            clearId: conversationId,
          });
        }
        messageOperator.error(
          {
            response_type: 'error',
            message: error instanceof Error ? error.message : String(error),
          },
          pendingId
        );
      } finally {
        const stayedOnConversation =
          !askFN || detachStreamRef.current === askFN.destroy;
        askAbortRef.current = null;
        if (askFN && detachStreamRef.current === askFN.destroy) {
          detachStreamRef.current = null;
        }
        setWaitingForAssistantDelta(false);
        setLoading(false);
        if (stayedOnConversation) {
          void history.refreshHistory().catch(() => undefined);
        }
      }
      return askFN
        ? { ...askFN.outcome, images: uploadedImages }
        : { failed: true, requestId: pendingId };
    }
    return undefined;
  };

  // Removes the local message of a request the server refused before
  // accepting it, so the retry does not leave a stray branch behind.
  const discardLocalMessage = (id: string | undefined) => {
    if (!id) return;
    uploadRetries.current.delete(id);
    setConversation(prev => {
      const message = prev.mapping[id];
      if (!message) return prev;
      const mapping = { ...prev.mapping };
      delete mapping[id];
      const parent = message.parent_id ? mapping[message.parent_id] : undefined;
      if (parent) {
        mapping[parent.id] = {
          ...parent,
          children: parent.children.filter(child => child !== id),
        };
      }
      return {
        ...prev,
        mapping,
        current_node:
          prev.current_node === id
            ? message.parent_id || undefined
            : prev.current_node,
      };
    });
  };

  // The interrupt was decided in another client after this page showed it:
  // drop the local decision, say so, and show what the server has now.
  const syncAfterDecidedElsewhere = async (
    outcome: SendTurnOutcome,
    nodeId: string
  ) => {
    discardLocalMessage(outcome.requestId);
    toast.info(i18n.t('chat.decision.already_decided'));
    return await history.latestBelow(nodeId).catch(() => undefined);
  };

  const sendMessage = async (
    params: SendMessageParams,
    retryId?: string,
    retryParentId?: string
  ) => {
    if (retryId || params.decisions?.length) {
      const parentId = retryId ? retryParentId : messages.at(-1)?.id;
      const outcome = await sendTurn(params, parentId, { retryId });
      if (outcome?.alreadyDecided && parentId)
        await syncAfterDecidedElsewhere(outcome, parentId);
      return;
    }
    // A failed local message is not a place to continue from.
    const base = lastServerMessage(messages);
    let leaf: LatestMessage | undefined = base && {
      id: base.id,
      role: base.message.role,
      parentId: base.parent_id || undefined,
      interrupts: base.attrs?.tool_call?.interrupts ?? [],
      decisions: base.attrs?.tool_call?.decisions ?? [],
    };
    if (base) {
      const latest = await history.latestBelow(base.id).catch(() => undefined);
      // A question still being answered elsewhere stays out of the view; the
      // server waits for its reply and continues from it (follow_latest).
      if (latest && !(isQuestion(latest) && latest.id !== base.id))
        leaf = latest;
    }
    const { leafId, pending } = continuationOf(leaf);
    const interruptedTurn = [...messages]
      .reverse()
      .find(message => message.message.role === OpenAIMessageRole.USER)?.attrs;
    const phase = { rejecting: false, stopped: false };
    rejectPhaseRef.current = phase;
    try {
      await sendRejectingPending({
        params,
        leafId,
        pending,
        send: async (turnParams, parentId, options) => {
          phase.rejecting = Boolean(turnParams.decisions?.length);
          try {
            return await sendTurn(turnParams, parentId, options);
          } finally {
            phase.rejecting = false;
          }
        },
        discard: outcome => discardLocalMessage(outcome.requestId),
        abandon: (outcome, stopped, nodeId) => {
          // Accepted decisions were renamed to their server ID.
          discardLocalMessage(outcome?.requestId);
          discardLocalMessage(outcome?.acceptedMessageId);
          if (!stopped) toast.error(i18n.t('chat.decision.reject_failed'));
          // The rejection may have reached the server even though this page
          // saw an error; sync from the interrupted message to find out.
          void history.latestBelow(nodeId).catch(() => undefined);
        },
        alreadyDecided: syncAfterDecidedElsewhere,
        isStopped: () => phase.stopped,
        decisionSettings:
          interruptedTurn?.edition && interruptedTurn.level
            ? { edition: interruptedTurn.edition, level: interruptedTurn.level }
            : {},
      });
    } finally {
      if (rejectPhaseRef.current === phase) rejectPhaseRef.current = null;
    }
  };

  useConversationBootstrap({
    getConversation: () => conversationRef.current,
    app,
    askAbortRef,
    cacheScope,
    conversationId,
    messageOperator,
    namespaceId,
    sendMessage,
    detachActiveStream,
    setAccessDenied,
    setConversation,
    setInitialApprovalMode,
    setSuppressInitialToolRestore,
    userId,
  });

  const mergedLoading =
    loading ||
    (conversation.total === undefined && !conversation.current_node) ||
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
        currentResourceId,
        undefined,
        undefined,
        parentMessage.attrs?.edition,
        parentMessage.attrs?.level
      );
      askAbortRef.current = askFN.cancel;
      try {
        await askFN.start();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : String(error));
      }
    } finally {
      askAbortRef.current = null;
      regeneratingRef.current = false;
      setRegeneratingParentId(null);
      setLoading(false);
      void history.refreshHistory().catch(() => undefined);
    }
  };

  const onEdit = async (messageId: string, newContent: string) => {
    const retryUpload = uploadRetries.current.get(messageId);
    if (retryUpload) return retryUpload();
    const parentId = serverAncestorId(
      conversation,
      conversation.mapping[messageId].parent_id
    );
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
        editedMessage.attrs?.tool_call?.decisions
          ? { decisions: editedMessage.attrs.tool_call.decisions }
          : undefined,
        undefined,
        undefined,
        currentResourceId,
        getUserMessageImages(editedMessage.attrs?.composer?.display_parts).map(
          image => ({
            attachment_id: image.attachment_id,
            name: image.name,
            url: image.preview_url,
          })
        ),
        editedMessage.attrs?.pending_query &&
          newContent === editedMessage.message.content
          ? messageId
          : undefined,
        editedMessage.attrs?.edition,
        editedMessage.attrs?.level
      );
      askAbortRef.current = askFN.cancel;
      await askFN.start();
    } finally {
      askAbortRef.current = null;
      setLoading(false);
      void history.refreshHistory().catch(() => undefined);
    }
  };

  const onStop = async () => {
    // The rejection before a typed message is short and never calls the
    // model; let it finish so the conversation does not end at a half-applied
    // decision, and only drop the typed message.
    if (rejectPhaseRef.current?.rejecting) {
      rejectPhaseRef.current.stopped = true;
      return;
    }
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
      conversation.title ||
      loading ||
      waitingForAssistantDelta ||
      firstUserMessage.status !== MessageStatus.SUCCESS
    ) {
      return;
    }
    const text = messagePreviewTitle(firstUserMessage.message.content);
    if (!text) return;
    app.fire('chat:title', { conversationId, text });
  }, [
    app,
    conversation.title,
    conversationId,
    firstUserMessage?.message.content,
    loading,
    waitingForAssistantDelta,
  ]);

  return {
    ...history,
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
