import useConfig from '@/hooks/useConfig';
import UnauthorizedPage from '@/page/auth/UnauthorizedPage';
import { useChatRouteParams } from '@/page/chat/ChatRouteParamsContext';
import useContext from '@/page/chat/conversation/useContext';
import { useConversationShare } from '@/page/chat/share/useConversationShare';
import { useConversationShareEvents } from '@/page/chat/share/useConversationShareEvents';

import {
  ConversationFooter,
  ConversationMessageList,
} from './ConversationContent';

export default function ChatConversationPage() {
  const { config } = useConfig();
  const { compact } = useChatRouteParams();
  const context = useContext();
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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <ConversationMessageList
        compact={compact}
        context={context}
        share={conversationShare}
      />
      <ConversationFooter
        commercial={config.commercial}
        context={context}
        share={conversationShare}
      />
    </div>
  );
}
