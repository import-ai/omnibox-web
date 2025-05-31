import useContext from '@/page/chat/conversation/context';
import ChatArea from '@/page/chat/chat-input';
import { useEffect, useRef, useState } from 'react';
import { prepareBody } from '@/page/chat/conversation/tools';
import { http } from '@/lib/request';
import { stream } from '@/page/chat/utils';
import {
  ConversationDetail,
  MessageDetail,
} from '@/page/chat/types/conversation';
import {
  ChatResponse,
  OpenAIMessageRole,
} from '@/page/chat/types/chat-response';

export default function ChatConversationPage() {
  const [value, onChange] = useState<string>('');
  const {
    routeQuery,
    setConversation,
    conversation,
    messages,
    addMessage,
    updateMessage,
    messageDone,
    namespaceId,
    conversationId,
    tools,
    onToolsChange,
    context,
    onContextChange,
  } = useContext();

  const conversationRef = useRef<ConversationDetail>(conversation);
  const messagesRef = useRef<MessageDetail[]>(messages);

  useEffect(() => {
    conversationRef.current = conversation;
    messagesRef.current = messages;
  }, [conversation, messages]);

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
        const body = prepareBody(
          namespaceId,
          conversationId,
          routeQuery,
          tools,
          context,
          messages,
        );
        let messageId: string = '';

        await stream('/api/v1/wizard/ask', body, async (data) => {
          let chatResponse: ChatResponse = JSON.parse(data);

          if (chatResponse.response_type === 'bos') {
            if (messageId) {
              throw new Error('Message ID already exists');
            }
            messageId = addMessage(chatResponse);
          } else if (chatResponse.response_type === 'delta') {
            updateMessage(messageId, chatResponse);
          } else if (chatResponse.response_type === 'eos') {
            messageDone(messageId);
            messageId = '';
          } else if (chatResponse.response_type === 'done') {
          } else if (chatResponse.response_type === 'error') {
            console.error(chatResponse);
          } else {
            console.error({ message: 'Unknown response type', chatResponse });
          }
        });
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
          <pre>{JSON.stringify(message.attrs?.citations, null, 2)}</pre>
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
