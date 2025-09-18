import { useTranslation } from 'react-i18next';

import ChatArea from '@/page/chat/chat-input';
import useContext from '@/page/chat/conversation/useContext';
import { Messages } from '@/page/chat/messages';
import { normalizeChatData } from '@/page/chat/normalize-chat';

import Scrollbar from './scrollbar';

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
    onToolsChange,
    onContextChange,
    namespaceId,
  } = useContext();

  return (
    <div className="flex flex-1 flex-col h-full">
      <Scrollbar>
        <Messages messages={normalizeChatData(messages)} />
      </Scrollbar>
      <div className="flex justify-center px-4">
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
            onToolsChange={onToolsChange}
            onContextChange={onContextChange}
            navigatePrefix={`/${namespaceId}`}
          />
          <div className="text-center text-xs pt-2 text-muted-foreground truncate">
            {t('chat.disclaimer')}
          </div>
        </div>
      </div>
    </div>
  );
}
