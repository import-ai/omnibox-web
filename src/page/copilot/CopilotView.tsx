import { lazy, Suspense } from 'react';

import { Skeleton } from '@/components/ui/Skeleton';
import { ChatRouteParamsProvider } from '@/page/chat/ChatRouteParamsContext';

import CopilotHome from './CopilotHome';
import { getCopilotWorkspace, useCopilotStore } from './copilotStore';

const ChatConversationPage = lazy(() => import('@/page/chat/conversation'));
const ChatConversationsPage = lazy(() => import('@/page/chat/conversations'));

interface CopilotViewProps {
  namespaceId: string;
}

function ViewFallback() {
  return (
    <div className="space-y-3 p-4" role="status">
      <Skeleton className="h-5 w-2/5" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-4/5" />
    </div>
  );
}

export default function CopilotView({ namespaceId }: CopilotViewProps) {
  const workspace = useCopilotStore(state =>
    getCopilotWorkspace(state, namespaceId)
  );
  const showConversation = useCopilotStore(state => state.showConversation);

  if (workspace.view === 'home') {
    return <CopilotHome namespaceId={namespaceId} />;
  }

  if (workspace.view === 'history') {
    return (
      <Suspense fallback={<ViewFallback />}>
        <ChatConversationsPage
          namespaceId={namespaceId}
          onConversationSelect={conversationId =>
            showConversation(namespaceId, conversationId)
          }
        />
      </Suspense>
    );
  }

  if (!workspace.conversationId) return null;

  return (
    <Suspense fallback={<ViewFallback />}>
      <ChatRouteParamsProvider
        compact
        conversationId={workspace.conversationId}
        namespaceId={namespaceId}
      >
        <ChatConversationPage />
      </ChatRouteParamsProvider>
    </Suspense>
  );
}
