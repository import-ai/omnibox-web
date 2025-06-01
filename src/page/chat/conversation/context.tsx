import { http } from '@/lib/request';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigationType, useParams } from 'react-router-dom';
import {
  ConversationDetail,
  MessageDetail,
} from '@/page/chat/types/conversation';
import useGlobalContext, { IResTypeContext } from '@/page/chat/useContext';
import { ToolType } from '@/page/chat/chat-input/types';
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
}

export default function useContext() {
  const params = useParams();

  const loc = useLocation();
  const navigationType = useNavigationType();
  const state: StateProps = loc.state;
  const namespaceId = state?.namespaceId || params.namespace_id || '';
  const conversationId = state?.conversationId || params.conversation_id || '';
  const routeQuery: string | undefined = state?.value;
  const allowAsk: boolean = navigationType === 'PUSH';
  const [tools, onToolsChange] = useState<Array<ToolType>>(state?.tools || []);
  const [loading, setLoading] = useState<boolean>(false);
  const { context, onContextChange } = useGlobalContext({
    data: state?.context || [],
  });

  const [conversation, setConversation] = useState<ConversationDetail>({
    id: conversationId,
    mapping: {},
  });
  const refetch = () => {
    http
      .get(`/namespaces/${namespaceId}/conversations/${conversationId}`)
      .then(setConversation);
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

  useEffect(refetch, [namespaceId, conversationId]);

  return {
    routeQuery,
    allowAsk,
    conversation,
    setConversation,
    messageOperator,
    messages,
    namespaceId,
    conversationId,
    tools,
    onToolsChange,
    context,
    onContextChange,
    loading,
    setLoading,
  };
}
