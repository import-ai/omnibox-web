import { http } from '@/lib/request';
import { useEffect, useState } from 'react';
import { ConversationDetail } from '@/page/chat/interface.ts';

interface IProps {
  namespaceId: string;
  conversationId: string;
}

export default function useConversation(props: IProps) {
  const { namespaceId, conversationId } = props;
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
