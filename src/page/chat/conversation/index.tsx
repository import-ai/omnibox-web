import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { AgentTrial } from '@/page/chat/agent-trial/agent-trial.tsx';
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Scrollbar>
        {messages.length <= 0 ? (
          <div className="flex items-center justify-end space-y-4">
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
        <div className="w-full max-w-3xl">
          <AgentTrial namespaceId={namespaceId} messages={messages} />
          <ChatArea
            selectedResources={selectedResources}
            setSelectedResources={setSelectedResources}
            messages={messages}
            navigatePrefix={`/${namespaceId}`}
            sendMessage={sendMessage}
            loading={loading}
          />
          <div className="truncate pt-2 text-center text-xs text-muted-foreground">
            {t('chat.disclaimer')}
          </div>
        </div>
      </div>
    </div>
  );
}
