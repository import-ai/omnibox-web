import { http } from '@/lib/request';
import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { ConversationDetail } from '@/page/chat/interface.ts';
import useGlobalContext, { IResTypeContext } from '@/page/chat/useContext';
import { ToolType } from '@/page/chat/chat-input/types';

interface IProps {
  value: string;
  context: IResTypeContext[];
  tools: ToolType[];
  namespaceId: string;
  conversationId: string;
}

export default function useContext() {
  const params = useParams();

  const loc = useLocation();
  const state: IProps = loc.state;
  const namespaceId = state?.namespaceId || params.namespace_id || '';
  const conversationId = state?.conversationId || params.conversation_id || '';
  const routeQuery: string | undefined = state?.value;
  const [tools, onToolsChange] = useState<Array<ToolType>>(state?.tools || []);
  const { context, onContextChange } = useGlobalContext({
    data: state?.context || [],
  });

  const [conversation, setConversation] = useState<ConversationDetail>(
    new ConversationDetail({
      id: conversationId,
      mapping: {},
    }),
  );
  const refetch = () => {
    http
      .get(`/namespaces/${namespaceId}/conversations/${conversationId}`)
      .then((res) => setConversation(new ConversationDetail(res)));
  };

  useEffect(refetch, [namespaceId, conversationId]);

  return {
    routeQuery,
    conversation,
    setConversation,
    namespaceId,
    conversationId,
    tools,
    onToolsChange,
    context,
    onContextChange,
  };
}
