import useContext from '@/page/chat/conversation/useContext.ts';
import { MessageDetail, OpenAIMessageRole } from '@/page/chat/interface.ts';

export default function ChatConversationPage() {
  const { data } = useContext();

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
      <p>
        {data?.title ||
          data?.getMessage(OpenAIMessageRole.USER)?.message?.content}
      </p>
      <div className="flex-1 overflow-y-auto">
        {data?.messages.map((m, index) => (
          <div key={m.id}>
            {renderMessage(m)}
            {index < data?.messages.length - 1 && (
              <hr className="my-4 border-gray-300" />
            )}
          </div>
        ))}
      </div>
    </>
  );
}
