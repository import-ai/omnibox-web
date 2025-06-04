import ChatArea from '@/page/chat/chat-input';
import { Messages } from '@/page/chat/messages';
import useContext from '@/page/chat/conversation/context';

export default function ChatConversationPage() {
  const {
    value,
    tools,
    loading,
    onChange,
    onAction,
    messages,
    context,
    onToolsChange,
    onContextChange,
  } = useContext();

  return (
    <>
      <div className="flex-1">
        <Messages messages={messages} />
      </div>
      <div className="sticky bottom-4 pt-4">
        <ChatArea
          tools={tools}
          value={value}
          loading={loading}
          context={context}
          onChange={onChange}
          onAction={onAction}
          onToolsChange={onToolsChange}
          onContextChange={onContextChange}
        />
      </div>
    </>
  );
}
