import useApp from '@/hooks/use-app';
import { http } from '@/lib/request';
import { isFunction } from 'lodash-es';
import { ask } from '@/page/chat/conversation/utils';
import {
  type ChatActionType,
  ChatMode,
  type IResTypeContext,
  ToolType,
} from '@/page/chat/chat-input/types';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigationType, useParams } from 'react-router-dom';
import {
  ConversationDetail,
  MessageDetail,
} from '@/page/chat/types/conversation';
import useGlobalContext from '@/page/chat/useContext';
import {
  createMessageOperator,
  MessageOperator,
} from '@/page/chat/conversation/message-operator';

interface StateProps {
  value?: string;
  context?: IResTypeContext[];
  tools?: ToolType[];
  namespaceId?: string;
  conversationId?: string;
  mode?: ChatMode;
}

export default function useContext() {
  const app = useApp();
  const params = useParams();
  const loc = useLocation();
  const navigationType = useNavigationType();
  const state: StateProps = loc.state;
  const [value, onChange] = useState<string>('');
  const askAbortRef = useRef<() => void>(null);
  const namespaceId = state?.namespaceId || params.namespace_id || '';
  const conversationId = state?.conversationId || params.conversation_id || '';
  const routeQuery: string | undefined = state?.value;
  const allowAsk: boolean = navigationType === 'PUSH';
  const [tools, onToolsChange] = useState<Array<ToolType>>(state?.tools || []);
  const [loading, setLoading] = useState<boolean>(
    allowAsk && routeQuery !== undefined && routeQuery.trim().length > 0,
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
      .then((response) => {
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
      const message: MessageDetail = conversation.mapping[currentNode];
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
      );
      askAbortRef.current = askFN.destory;
      await askFN.start();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch().then(() => {
      allowAsk && submit(routeQuery);
    });
  }, [allowAsk, namespaceId, conversationId]);

  return {
    value,
    tools,
    loading,
    onChange,
    onAction,
    messages,
    context,
    onToolsChange,
    onContextChange,
    mode,
    setMode,
  };
}
