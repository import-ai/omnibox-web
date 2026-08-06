import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import useConfig from '@/hooks/useConfig';
import { AgentTrial } from '@/page/chat/agent-trial/AgentTrial';
import ChatArea from '@/page/chat/chat-input';
import { useChatRouteParams } from '@/page/chat/ChatRouteParamsContext';
import useContext from '@/page/chat/conversation/useContext';
import { Messages } from '@/page/chat/messages';
import { MessageIndex } from '@/page/chat/messages/MessageIndex';

import Scrollbar from './Scrollbar';

export default function ChatConversationPage() {
  const { t } = useTranslation();
  const { config } = useConfig();
  const { compact } = useChatRouteParams();
  const {
    loading,
    waitingForAssistantDelta,
    regeneratingParentId,
    messages,
    namespaceId,
    conversation,
    messageOperator,
    selectedResources,
    setSelectedResources,
    initialApprovalMode,
    suppressInitialToolRestore,
    onRegenerate,
    onEdit,
    onStop,
    sendMessage,
  } = useContext();

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <Scrollbar
        resetKey={conversation.id}
        sideContent={compact ? undefined : <MessageIndex messages={messages} />}
      >
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
            regeneratingParentId={regeneratingParentId}
          />
        )}
      </Scrollbar>
      <div className="flex min-w-0 justify-center px-4">
        <div className="min-w-0 w-full max-w-3xl">
          {config.commercial && (
            <AgentTrial namespaceId={namespaceId} messages={messages} />
          )}
          <ChatArea
            key={conversation.id}
            selectedResources={selectedResources}
            setSelectedResources={setSelectedResources}
            messages={messages}
            namespaceId={namespaceId}
            navigatePrefix={`/${namespaceId}`}
            initialApprovalMode={initialApprovalMode}
            approvalModeResetKey={conversation.id}
            suppressInitialToolRestore={suppressInitialToolRestore}
            sendMessage={sendMessage}
            loading={loading}
            waitingForAssistantDelta={waitingForAssistantDelta}
            onStop={onStop}
          />
          <div className="text-center text-xs pt-2 text-muted-foreground truncate">
            {t('chat.disclaimer')}
          </div>
        </div>
      </div>
    </div>
  );
}
