import useContext from '@/page/chat/conversation/context';
import { MessageDetail, OpenAIMessageRole } from '@/page/chat/interface.ts';
import ChatArea from '@/page/chat/chat-input';
import { useEffect } from 'react';
import { prepareBody } from '@/page/chat/conversation/tools.tsx';

export default function ChatConversationPage() {
  const {
    conversation,
    namespaceId,
    conversationId,
    value,
    onChange,
    tools,
    onToolsChange,
    context,
    onContextChange,
  } = useContext();

  console.log({ conversation });

  useEffect(() => {
    console.log({ context, tools, conversation });
    if (value) {
      const body = prepareBody(
        namespaceId,
        conversationId,
        value,
        tools,
        context,
        conversation.messages,
      );
      console.log({ body });
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
