import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import useConfig from '@/hooks/useConfig';
import { AgentTrial } from '@/page/chat/agent-trial/AgentTrial';
import ChatArea from '@/page/chat/chat-input';
import useContext from '@/page/chat/conversation/useContext';
import { Messages } from '@/page/chat/messages';
import { MessageIndex } from '@/page/chat/messages/MessageIndex';

import Scrollbar from './Scrollbar';

export default function ChatConversationPage() {
  const { t } = useTranslation();
  const { config } = useConfig();
  const {
    loading,
    regeneratingParentId,
    messages,
    namespaceId,
    conversation,
    messageOperator,
    selectedResources,
    setSelectedResources,
    initialApprovalMode,
    onRegenerate,
    onEdit,
    sendMessage,
  } = useContext();

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
          <>
            <MessageIndex messages={messages} />
            <Messages
              conversation={conversation}
              messages={messages}
              messageOperator={messageOperator}
              onRegenerate={onRegenerate}
              onEdit={onEdit}
              regeneratingParentId={regeneratingParentId}
            />
          </>
        )}
      </Scrollbar>
      <div className="flex justify-center px-4">
        <div className="max-w-3xl w-full">
          {config.commercial && (
            <AgentTrial namespaceId={namespaceId} messages={messages} />
          )}
          <ChatArea
            selectedResources={selectedResources}
            setSelectedResources={setSelectedResources}
            messages={messages}
            navigatePrefix={`/${namespaceId}`}
            initialApprovalMode={initialApprovalMode}
            approvalModeResetKey={conversation.id}
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
