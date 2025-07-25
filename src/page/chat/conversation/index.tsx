import Scrollbar from './scrollbar';
import { useTranslation } from 'react-i18next';
import ChatArea from '@/page/chat/chat-input';
import { Messages } from '@/page/chat/messages';
import useContext from '@/page/chat/conversation/useContext';

export default function ChatConversationPage() {
  const { t } = useTranslation();
  const {
    mode,
    value,
    tools,
    setMode,
    loading,
    context,
    onChange,
    onAction,
    messages,
    thinking,
    onThinking,
    onToolsChange,
    onContextChange,
  } = useContext();

  return (
    <div className="flex flex-col h-full">
      <Scrollbar>
        <Messages messages={messages} />
      </Scrollbar>
      <div className="flex justify-center">
        <div className="flex-1 max-w-3xl w-full">
          <ChatArea
            mode={mode}
            tools={tools}
            value={value}
            setMode={setMode}
            loading={loading}
            context={context}
            onChange={onChange}
            onAction={onAction}
            thinking={thinking}
            onThink={onThinking}
            onToolsChange={onToolsChange}
            onContextChange={onContextChange}
          />
          <div className="text-center text-xs pt-2 text-muted-foreground truncate">
            {t('chat.disclaimer')}
          </div>
        </div>
      </div>
    </div>
  );
}
