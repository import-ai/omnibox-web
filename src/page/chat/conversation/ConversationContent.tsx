import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { AgentTrial } from '@/page/chat/agent-trial/AgentTrial';
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
      )}
    </Scrollbar>
  );
}

export function ConversationFooter({
  commercial,
  context,
  share,
}: {
  commercial: boolean;
  context: ConversationContext;
  share: ConversationShareController;
}) {
  const { t } = useTranslation();
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
    <div className="flex min-w-0 justify-center px-4">
      <div className="min-w-0 w-full max-w-3xl">
        {commercial && (
          <AgentTrial
            namespaceId={context.namespaceId}
            messages={context.messages}
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
          waitingForAssistantDelta={context.waitingForAssistantDelta}
          onStop={context.onStop}
        />
        <div className="truncate pt-2 text-center text-xs text-muted-foreground">
          {t('chat.disclaimer')}
        </div>
      </div>
    </div>
  );
}
