import useContext from '@/page/chat/conversation/context';
import ChatArea from '@/page/chat/chat-input';
import { useEffect, useState } from 'react';
import { ask } from '@/page/chat/conversation/tools';
import { http } from '@/lib/request';
import {
  ConversationDetail,
  MessageDetail,
} from '@/page/chat/types/conversation';
import { OpenAIMessageRole } from '@/page/chat/types/chat-response';

export default function ChatConversationPage() {
  const [value, onChange] = useState<string>('');
  const {
    routeQuery,
    setConversation,
    messages,
    messageOperator,
    namespaceId,
    conversationId,
    tools,
    onToolsChange,
    context,
    onContextChange,
  } = useContext();

  const refetch = async () => {
    const res: ConversationDetail = await http.get(
      `/namespaces/${namespaceId}/conversations/${conversationId}`,
    );
    setConversation(res);
    return res;
  };

  useEffect(() => {
    if (routeQuery) {
      refetch().then(async () => {
        await ask(
          namespaceId,
          conversationId,
          routeQuery,
          tools,
          context,
          messages,
          messageOperator,
        );
      });
    }
  }, []);

  function renderMessage(message: MessageDetail) {
    const openAIMessage = message.message;
    const common = () => (
      <>
        <p>Role: {openAIMessage.role}</p>
        {openAIMessage.reasoning_content && (
          <p>Think: {openAIMessage.reasoning_content}</p>
        )}
        {openAIMessage.content && <p>Content: {openAIMessage.content}</p>}
      </>
    );

    if (openAIMessage.role === OpenAIMessageRole.USER) {
      return common();
    } else if (openAIMessage.role === OpenAIMessageRole.ASSISTANT) {
      if (openAIMessage.tool_calls) {
        return (
          <>
            {common()}
            <p>Function: {openAIMessage.tool_calls[0].function.name}</p>
            <p>Arguments:</p>
            <pre>
              {JSON.stringify(
                JSON.parse(openAIMessage.tool_calls[0].function.arguments),
                null,
                2,
              )}
            </pre>
          </>
        );
      } else {
        return common();
      }
    } else if (openAIMessage.role === OpenAIMessageRole.TOOL) {
      return (
        <>
          <p>Role: {openAIMessage.role}</p>
          <p>Citations:</p>
          <pre>{JSON.stringify(message.attrs?.citations || [], null, 2)}</pre>
        </>
      );
    }
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        {messages.map((m, index) => (
          <div key={m.id}>
            {renderMessage(m)}
            {index < messages.length - 1 && (
              <hr className="my-4 border-gray-300" />
            )}
          </div>
        ))}
      </div>
      <ChatArea
        tools={tools}
        value={value}
        context={context}
        onChange={onChange}
        onAction={() => {}}
        onToolsChange={onToolsChange}
        onContextChange={onContextChange}
      />
    </>
  );
}
