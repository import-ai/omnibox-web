import useConfig from '@/hooks/useConfig';
import { useBehaviorSurface } from '@/lib/behaviorTracking';
import UnauthorizedPage from '@/page/auth/UnauthorizedPage';
import { useChatRouteParams } from '@/page/chat/ChatRouteParamsContext';
import useContext from '@/page/chat/conversation/useContext';
import { useConversationShare } from '@/page/chat/share/useConversationShare';
import { useConversationShareEvents } from '@/page/chat/share/useConversationShareEvents';
import {
  getCopilotWorkspace,
  useCopilotStore,
} from '@/page/copilot/copilotStore';
import { ConversationExecutionsProvider } from '@/page/localRuntime/ConversationExecutions';

import {
  ConversationFooter,
  ConversationMessageList,
} from './ConversationContent';

export default function ChatConversationPage() {
  const { config } = useConfig();
  const { compact } = useChatRouteParams();
  const context = useContext();
  const copilotOpen = useCopilotStore(
    state => getCopilotWorkspace(state, context.namespaceId).open
  );
  useBehaviorSurface({
    scope: 'conversation',
    target: compact ? 'copilot' : 'conversation',
    active: !context.accessDenied && (!compact || copilotOpen),
    props: { conversation_id: context.conversation.id },
  });
  const conversationShare = useConversationShare({
    conversation: context.conversation,
    isGenerating: context.loading,
    messages: context.messages,
    namespaceId: context.namespaceId,
  });
  useConversationShareEvents(context.conversation.id, conversationShare);

  if (context.accessDenied) {
    return <UnauthorizedPage />;
  }

  return (
    <div className="flex min-h-0 max-h-full min-w-0 flex-1 flex-col overflow-hidden">
      <ConversationExecutionsProvider conversationId={context.conversation.id}>
        <ConversationMessageList
          compact={compact}
          context={context}
          share={conversationShare}
        />
      </ConversationExecutionsProvider>
      <ConversationFooter
        compact={compact}
        commercial={config.commercial}
        context={context}
        share={conversationShare}
      />
    </div>
  );
}
