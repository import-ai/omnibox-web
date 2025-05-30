import { http } from '@/lib/request';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ConversationDetail } from '@/page/chat/interface.ts';

export default function useConversation() {
  const params = useParams();
  const namespaceId = params.namespace_id || '';
  const conversationId = params.conversation_id || '';
  const [data, onData] = useState<ConversationDetail>();
  const refetch = () => {
    http
      .get(`/namespaces/${namespaceId}/conversations/${conversationId}`)
      .then((res) => onData(new ConversationDetail(res)));
  };

  useEffect(refetch, [namespaceId]);

  return {
    data,
    refetch,
    namespaceId,
    conversationId,
  };
}
