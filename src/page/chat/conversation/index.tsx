import useContext from '@/page/chat/conversation/context';
import ChatArea from '@/page/chat/chat-input';
import { useEffect, useState } from 'react';
import { ask } from '@/page/chat/conversation/tools';
import { http } from '@/lib/request';
import { ConversationDetail } from '@/page/chat/types/conversation';
import { Messages } from '@/page/chat/messages';

export default function ChatConversationPage() {
  const [value, onChange] = useState<string>('');
  const {
    routeQuery,
    allowAsk,
    setConversation,
    messages,
    messageOperator,
    namespaceId,
    conversationId,
    tools,
    onToolsChange,
    context,
    onContextChange,
    loading,
    setLoading,
  } = useContext();

  const refetch = async () => {
    const res: ConversationDetail = await http.get(
      `/namespaces/${namespaceId}/conversations/${conversationId}`,
    );
    setConversation(res);
    return res;
  };

  const submit = async (query?: string) => {
    if (!query || query.trim().length === 0) {
      return;
    }
    setLoading(true);
    try {
      return await ask(
        namespaceId,
        conversationId,
        query,
        tools,
        context,
        messages,
        messageOperator,
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (allowAsk) {
      refetch().then(async () => submit(routeQuery));
    }
  }, [allowAsk]);

  const onAction = async (action?: 'stop' | 'disabled') => {
    if (action === 'stop') {
      /* TODO: Stop the current stream */
    } else {
      const v = value.trim();
      if (!v) {
        return;
      }
      onChange('');
      await submit(v);
    }
  };

  return (
    <>
      <Messages messages={messages} />
      <ChatArea
        tools={tools}
        value={value}
        context={context}
        onChange={onChange}
        onAction={onAction}
        onToolsChange={onToolsChange}
        onContextChange={onContextChange}
        loading={loading}
      />
    </>
  );
}
