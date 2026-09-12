import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Marker, MarkerContent, MarkerIcon } from '@/components/ui/Marker';
import { Spinner } from '@/components/ui/Spinner';
import { AgentCredits } from '@/page/chat/agent-credits/AgentCredits';
import { useAgentCredits } from '@/page/chat/agent-credits/useAgentCredits';
import ChatArea from '@/page/chat/chat-input';
import type useContext from '@/page/chat/conversation/useContext';
import { Messages } from '@/page/chat/messages';
import { MessageIndex } from '@/page/chat/messages/MessageIndex';
import { ConversationShareActions } from '@/page/chat/share/ConversationShareControls';
import type { useConversationShare } from '@/page/chat/share/useConversationShare';

import Scrollbar from './Scrollbar';

type ConversationContext = ReturnType<typeof useContext>;
type ConversationShareController = ReturnType<typeof useConversationShare>;

export function ConversationMessageList({
  compact,
  context,
  share,
}: {
  compact: boolean;
  context: ConversationContext;
  share: ConversationShareController;
}) {
  const { t } = useTranslation();
  return (
    <Scrollbar
      resetKey={context.conversation.id}
      sideContent={
        compact || share.isSelecting ? undefined : (
          <MessageIndex messages={context.messages} />
        )
      }
    >
      {context.messages.length <= 0 ? (
        <div className="flex items-center justify-end space-y-4">
          <Button disabled size="sm" variant="secondary">
            <Spinner />
          </Button>
        </div>
      ) : (
        <>
          <Messages
            conversation={context.conversation}
            messages={context.messages}
            messageOperator={context.messageOperator}
            onEdit={context.onEdit}
            onRegenerate={context.onRegenerate}
            onShareMessage={messageId => share.open(messageId, 'latest')}
            regeneratingParentId={context.regeneratingParentId}
            shareSelection={{
              isSelecting: share.isSelecting,
              messageGroupIds: share.messageGroupIds,
              onToggleGroup: share.toggleGroup,
              selectedGroupIds: share.selectedGroupIds,
            }}
          />
          {context.waitingForAssistantDelta &&
            context.messages.at(-1)?.message.role === 'user' &&
            context.messages.at(-1)?.status === MessageStatus.SUCCESS && (
              <Marker role="status" className="mt-4">
                <MarkerIcon>
                  <Spinner />
                </MarkerIcon>
                <MarkerContent className="shimmer">
                  {t('chat.delivery.thinking')}
                </MarkerContent>
              </Marker>
            )}
        </>
      )}
    </Scrollbar>
  );
}

export function ConversationFooter({
  compact,
  commercial,
  context,
  share,
}: {
  compact: boolean;
  commercial: boolean;
  context: ConversationContext;
  share: ConversationShareController;
}) {
  const { t } = useTranslation();
  const creditsEnabled = commercial && !share.isSelecting;
  const { agentCredits } = useAgentCredits(
    context.namespaceId,
    context.messages,
    creditsEnabled
  );
  const imageUploadDisabled =
    agentCredits !== undefined && agentCredits.agent_credits_remain <= 0;
  if (share.isSelecting) {
    return (
      <ConversationShareActions
        allSelected={share.allSelected}
        canShare={share.hasSelection}
        isSharing={share.isSharing}
        onClose={share.close}
        onShare={share.share}
        onToggleAll={share.toggleAll}
        selectedCount={share.selectedCount}
        sharingChannel={share.sharingChannel}
      />
    );
  }

  return (
    <div
      className="relative z-20 flex min-h-0 max-h-full min-w-0 shrink-0 justify-center bg-white px-4 dark:bg-background"
      data-chat-composer
    >
      <div className="min-w-0 w-full max-w-3xl">
        {commercial && (
          <AgentCredits
            compact={compact}
            namespaceId={context.namespaceId}
            agentCredits={agentCredits}
          />
        )}
        <ChatArea
          key={context.conversation.id}
          selectedResources={context.selectedResources}
          setSelectedResources={context.setSelectedResources}
          messages={context.messages}
          namespaceId={context.namespaceId}
          navigatePrefix={`/${context.namespaceId}`}
          initialApprovalMode={context.initialApprovalMode}
          approvalModeResetKey={context.conversation.id}
          suppressInitialToolRestore={context.suppressInitialToolRestore}
          sendMessage={context.sendMessage}
          loading={context.loading}
          imageUploadDisabled={imageUploadDisabled}
          waitingForAssistantDelta={context.waitingForAssistantDelta}
          onStop={context.onStop}
        />
        <div
          data-chat-disclaimer
          className="truncate pt-2 text-center text-xs text-muted-foreground"
        >
          {t('chat.disclaimer')}
        </div>
      </div>
    </div>
  );
}
