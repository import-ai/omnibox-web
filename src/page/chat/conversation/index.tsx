import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import ChatArea from '@/page/chat/chat-input';
import useContext from '@/page/chat/conversation/useContext';
import { Messages } from '@/page/chat/messages';

import Scrollbar from './scrollbar';

export default function ChatConversationPage() {
  const { t } = useTranslation();
  const {
    loading,
    messages,
    namespaceId,
    conversation,
    messageOperator,
    selectedResources,
    setSelectedResources,
    onRegenerate,
    onEdit,
    sendMessage,
  } = useContext();

  console.log({ method: 'conversationPage', messages });

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Scrollbar>
        {messages.length <= 0 ? (
          <div className="space-y-4 flex justify-end items-center">
            <Button disabled size="sm" variant="secondary">
              <Spinner />
            </Button>
          </div>
        ) : (
          <Messages
            conversation={conversation}
            messages={messages}
            messageOperator={messageOperator}
            onRegenerate={onRegenerate}
            onEdit={onEdit}
          />
        )}
      </Scrollbar>
      <div className="flex justify-center px-4">
        <div className="max-w-3xl w-full">
          <ChatArea
            selectedResources={selectedResources}
            setSelectedResources={setSelectedResources}
            messages={messages}
            navigatePrefix={`/${namespaceId}`}
            sendMessage={sendMessage}
            loading={loading}
          />
          <div className="text-center text-xs pt-2 text-muted-foreground truncate">
            {t('chat.disclaimer')}
          </div>
        </div>
      </div>
    </div>
  );
}
