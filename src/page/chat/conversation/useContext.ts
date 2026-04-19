import { isFunction } from 'lodash-es';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { FORCE_ASK } from '@/const';
import useApp from '@/hooks/use-app';
import { http } from '@/lib/request';
import { getWizardLang } from '@/lib/wizard-lang';
import { PendingInterrupt } from '@/page/chat/chat-input/decision-input';
import { ChatMode, InputMode, ToolType } from '@/page/chat/chat-input/types';
import { DecisionType } from '@/page/chat/conversation/types.ts';
import {
  ask,
  extractOriginalMessageSettings,
  findFirstMessageWithMissingParent,
} from '@/page/chat/conversation/utils.ts';
import {
  createMessageOperator,
  MessageOperator,
} from '@/page/chat/core/message-operator.ts';
import {
  ConversationDetail,
  MessageDetail,
} from '@/page/chat/core/types/conversation';
import useGlobalContext from '@/page/chat/useContext';

import { getTitleFromConversationDetail } from '../utils';

export default function useContext() {
  const app = useApp();
  const params = useParams();
  const { i18n } = useTranslation();
  const askAbortRef = useRef<() => void>(null);
  const namespaceId = params.namespace_id || '';
  const conversationId = params.conversation_id || '';
  const sessionState = sessionStorage.getItem('state');
  const state = sessionState ? JSON.parse(sessionState) : {};
  const routeQuery: string | undefined = state?.value;
  const [tools, onToolsChange] = useState<Array<ToolType>>(state?.tools || []);
  const [loading, setLoading] = useState<boolean>(
    routeQuery !== undefined && routeQuery.trim().length > 0
  );
  const [mode, setMode] = useState<ChatMode>(state?.mode || ChatMode.ASK);
  const { context, onContextChange } = useGlobalContext();
  const [conversation, setConversation] = useState<ConversationDetail>({
    id: conversationId,
    mapping: {},
  });
  const refetch = () => {
    return http
      .get(`/namespaces/${namespaceId}/conversations/${conversationId}`)
      .then(response => {
        const conversationTitle = getTitleFromConversationDetail(response);
        if (conversationTitle) {
          app.fire('chat:title:update', conversationTitle);
        }
        setConversation(response);
      });
  };
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
  const stopStreaming = () => {
    isFunction(askAbortRef.current) && askAbortRef.current();
    setLoading(false);
  };

  const sendMessage = async (query: string) => {
    const v = query.trim();
    if (v) {
      onContextChange([]);
      await submit(v);
    }
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
        context,
        messages[messages.length - 1]?.id,
        messageOperator,
        `/api/v1/namespaces/${namespaceId}/wizard/${FORCE_ASK ? 'ask' : mode}`,
        getWizardLang(i18n),
        namespaceId,
        undefined,
        undefined
      );
      askAbortRef.current = askFN.destroy;
      await askFN.start();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!state.conversation) {
      refetch();
      return;
    }
    const conversationTitle = getTitleFromConversationDetail(
      state.conversation
    );
    if (conversationTitle) {
      app.fire('chat:title:update', conversationTitle);
    }
    setConversation(state.conversation);
    sessionStorage.removeItem('state');
    onContextChange([]); // Before sending chat request in home page
    submit(routeQuery);
  }, []);

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
      context,
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
        `/api/v1/namespaces/${namespaceId}/wizard/${mode}`,
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
    } = extractOriginalMessageSettings(editedMessage, {
      tools,
      context,
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
        `/api/v1/namespaces/${namespaceId}/wizard/${mode}`,
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

  // Check if there are pending tool call interrupts that need user decision
  const pendingInterrupts = useMemo((): PendingInterrupt[] => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return [];

    const interrupts = lastMessage.attrs?.tool_call?.interrupts;
    if (!interrupts || interrupts.length === 0) return [];

    // Check which interrupts have been decided
    const decisions = lastMessage.attrs?.tool_call?.decisions;
    const decidedIndexes = new Set(decisions?.map((d: any) => d.index) ?? []);

    // Return all undecided interrupts
    const pending: PendingInterrupt[] = [];
    for (let i = 0; i < interrupts.length; i++) {
      if (!decidedIndexes.has(i)) {
        pending.push({ ...interrupts[i], index: i });
      }
    }
    return pending;
  }, [messages]);

  // Determine the input mode based on whether there are pending interrupts
  const inputMode = useMemo(() => {
    return pendingInterrupts.length > 0 ? InputMode.DECISION : InputMode.TEXT;
  }, [pendingInterrupts]);

  // Handle tool call decisions
  const onToolDecision = async (decisions: { type: DecisionType }[]) => {
    if (decisions.length === 0) return;

    setLoading(true);
    try {
      const lastMessage = messages[messages.length - 1];
      const askFN = ask(
        conversationId,
        '', // Empty query for decision requests
        [], // No tools for decision requests
        [], // No context for decision requests
        lastMessage.id,
        messageOperator,
        `/api/v1/namespaces/${namespaceId}/wizard/${mode}`,
        getWizardLang(i18n),
        namespaceId,
        undefined,
        undefined,
        undefined,
        {
          decisions: decisions.map(d => ({
            type: d.type,
          })),
        }
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
    mode,
    tools,
    setMode,
    loading,
    context,
    callbacks: { sendMessage, stopStreaming },
    messages,
    onToolsChange,
    onContextChange,
    namespaceId,
    conversation,
    messageOperator,
    onRegenerate,
    onEdit,
    inputMode,
    pendingInterrupts,
    onToolDecision,
  };
}
