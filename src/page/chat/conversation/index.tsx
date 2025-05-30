import useContext from '@/page/chat/conversation/context';
import {
  ChatCitationsResponse,
  ChatDeltaResponse,
  ChatDoneResponse,
  ChatThinkDeltaResponse,
  ConversationDetail,
  EndOfMessage,
  ErrorResponse,
  MessageDetail,
  OpenAIMessageRole,
  TollCallResponse,
} from '@/page/chat/interface.ts';
import ChatArea from '@/page/chat/chat-input';
import { useEffect, useState } from 'react';
import { prepareBody } from '@/page/chat/conversation/tools.tsx';
import { http } from '@/lib/request.ts';
import { stream } from '@/page/chat/utils.ts';

export default function ChatConversationPage() {
  const [value, onChange] = useState<string>('');
  const {
    routeQuery,
    conversation,
    setConversation,
    namespaceId,
    conversationId,
    tools,
    onToolsChange,
    context,
    onContextChange,
  } = useContext();

  const refetch = () => {
    return http
      .get(`/namespaces/${namespaceId}/conversations/${conversationId}`)
      .then((res) => {
        const c = new ConversationDetail(res);
        setConversation(c);
        return c;
      });
  };

  useEffect(() => {
    if (routeQuery) {
      refetch().then(async (c) => {
        const body = prepareBody(
          namespaceId,
          conversationId,
          value,
          tools,
          context,
          c.messages,
        );

        await stream('/api/v1/wizard/ask', body, async (data) => {
          let chatResponse:
            | ChatDeltaResponse
            | ChatCitationsResponse
            | ChatDoneResponse
            | TollCallResponse
            | ChatThinkDeltaResponse
            | EndOfMessage
            | ErrorResponse = JSON.parse(data);

          const openAIMessage: Record<string, any> = {};
          // const messageDetail: Record<string, any> = {
          //   id: 'currentMessage',
          //   message: openAIMessage,
          // };

          if (chatResponse.response_type === 'delta') {
            openAIMessage.content =
              (openAIMessage?.content || '') + chatResponse.delta;
          } else if (chatResponse.response_type === 'think_delta') {
            openAIMessage.reasoning_content =
              (openAIMessage?.reasoning_content || '') + chatResponse.delta;
          } else if (chatResponse.response_type === 'tool_call') {
          } else if (chatResponse.response_type === 'citations') {
          } else if (chatResponse.response_type === 'error') {
            console.error({ message: chatResponse.message });
          } else if (chatResponse.response_type === 'done') {
          } else if (chatResponse.response_type === 'end_of_message') {
            const lastMessage = localMessages[localMessages.length - 1];
            if (lastMessage.role === chatResponse.role) {
              lastMessage.id = chatResponse.messageId;
              setMessages(localMessages);
            } else {
              console.error({
                message: 'Message role mismatch',
                lastMessageRole: lastMessage.role,
                targetMessageRole: chatResponse.role,
              });
            }
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
        {conversation?.messages.map((m, index) => (
          <div key={m.id}>
            {renderMessage(m)}
            {index < conversation?.messages.length - 1 && (
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
