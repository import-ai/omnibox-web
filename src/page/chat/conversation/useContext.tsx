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
import { ask } from '@/page/chat/conversation/utils';
import {
  ConversationDetail,
  MessageDetail,
} from '@/page/chat/types/conversation';
import useGlobalContext from '@/page/chat/useContext';

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
  const { context, onContextChange } = useGlobalContext({
    data: state?.context || [],
  });
  const [conversation, setConversation] = useState<ConversationDetail>({
    id: conversationId,
    mapping: {},
  });
  const refetch = () => {
    return http
      .get(`/namespaces/${namespaceId}/conversations/${conversationId}`)
      .then(response => {
        if (response.title) {
          app.fire('chat:title:update', response.title);
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
    return createMessageOperator(setConversation);
  }, [setConversation]);
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
        namespaceId,
        conversationId,
        query,
        tools,
        context,
        messages,
        messageOperator,
        mode,
        getWizardLang(i18n)
      );
      askAbortRef.current = askFN.destory;
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
    if (state.conversation.title) {
      app.fire('chat:title:update', state.conversation.title);
    }
    setConversation(state.conversation);
    sessionStorage.removeItem('state');
    submit(routeQuery);
  }, []);

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
  };
}
