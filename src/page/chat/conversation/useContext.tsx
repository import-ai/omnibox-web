import { isFunction } from 'lodash-es';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import useApp from '@/hooks/use-app';
import { http } from '@/lib/request';
import { getWizardLang } from '@/lib/wizard-lang';
import {
  type ChatActionType,
  ChatMode,
  ToolType,
} from '@/page/chat/chat-input/types';
import {
  createMessageOperator,
  MessageOperator,
} from '@/page/chat/conversation/message-operator';
import { ask, extractToolsAndContext } from '@/page/chat/conversation/utils';
import {
  ConversationDetail,
  MessageDetail,
} from '@/page/chat/types/conversation';
import useGlobalContext from '@/page/chat/useContext';

import { getTitleFromConversationDetail } from '../utils';

export default function useContext() {
  const app = useApp();
  const params = useParams();
  const { i18n } = useTranslation();
  const [value, onChange] = useState<string>('');
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
  const onAction = async (action?: ChatActionType) => {
    if (action === 'stop') {
      isFunction(askAbortRef.current) && askAbortRef.current();
      setLoading(false);
      return;
    } else {
      const v = value.trim();
      if (v) {
        onChange('');
        await submit(v);
      }
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
        `/api/v1/namespaces/${namespaceId}/wizard/${mode}`,
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
    submit(routeQuery);
  }, []);

  const onRegenerate = async (messageId: string) => {
    const parentId = messageOperator.getParent(messageId);
    const parentMessage = conversation.mapping[parentId];
    if (!parentMessage || !parentMessage.message.content) {
      console.error('Cannot find parent user message to regenerate from');
      return;
    }

    // Use original tools/settings from parent message, fallback to current state
    let originalTools = tools;
    let originalContext = context;
    let originalLang = getWizardLang(i18n);
    let originalEnableThinking: boolean | undefined = undefined;

    if (parentMessage.attrs?.tools) {
      const extracted = extractToolsAndContext(parentMessage.attrs.tools);
      originalTools = extracted.tools;
      originalContext = extracted.context;
    }
    if (parentMessage.attrs?.lang) {
      originalLang = parentMessage.attrs.lang;
    }
    if (parentMessage.attrs?.enable_thinking !== undefined) {
      originalEnableThinking = parentMessage.attrs.enable_thinking;
    }

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

    // Use original tools/settings from the message being edited, fallback to current state
    let originalTools = tools;
    let originalContext = context;
    let originalLang = getWizardLang(i18n);
    let originalEnableThinking: boolean | undefined = undefined;

    if (editedMessage.attrs?.tools) {
      const extracted = extractToolsAndContext(editedMessage.attrs.tools);
      originalTools = extracted.tools;
      originalContext = extracted.context;
    }
    if (editedMessage.attrs?.lang) {
      originalLang = editedMessage.attrs.lang;
    }
    if (editedMessage.attrs?.enable_thinking !== undefined) {
      originalEnableThinking = editedMessage.attrs.enable_thinking;
    }

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

  return {
    mode,
    value,
    tools,
    setMode,
    loading,
    context,
    onChange,
    onAction,
    messages,
    onToolsChange,
    onContextChange,
    namespaceId,
    conversation,
    messageOperator,
    onRegenerate,
    onEdit,
  };
}
