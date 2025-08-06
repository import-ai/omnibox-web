import useApp from '@/hooks/use-app';
import { http } from '@/lib/request';
import { useParams } from 'react-router-dom';
import { isFunction, isUndefined } from 'lodash-es';
import { ask } from '@/page/chat/conversation/utils';
import useGlobalContext from '@/page/chat/useContext';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChatMode,
  ToolType,
  type ChatActionType,
} from '@/page/chat/chat-input/types';
import {
  MessageDetail,
  ConversationDetail,
} from '@/page/chat/types/conversation';
import {
  MessageOperator,
  createMessageOperator,
} from '@/page/chat/conversation/message-operator';

export default function useContext() {
  const app = useApp();
  const params = useParams();
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
  const [thinking, onThinking] = useState<boolean | ''>(
    isUndefined(state.thinking) ? false : state.thinking
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
        thinking,
        context,
        messages,
        messageOperator,
        mode
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
    thinking,
    onThinking,
    onToolsChange,
    onContextChange,
  };
}
