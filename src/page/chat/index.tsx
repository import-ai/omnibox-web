import { useParams } from 'react-router-dom';

import { SidebarInset } from '@/components/ui/Sidebar';
import { cn } from '@/lib/utils';
import {
  getCopilotWorkspace,
  useCopilotStore,
} from '@/page/copilot/copilotStore';
import CopilotView from '@/page/copilot/CopilotView';

import Page from './ChatPage';
import { ChatRouteParamsProvider } from './ChatRouteParamsContext';
import Header from './header';

export default function Chat() {
  const params = useParams();
  const namespaceId = params.namespace_id || '';
  const conversationId = params.conversation_id || '';
  const workspace = useCopilotStore(state =>
    getCopilotWorkspace(state, namespaceId)
  );
  const pendingExpandFromResource = useCopilotStore(
    state => !!state.pendingExpandFromResource[namespaceId]
  );
  const previewingCitation = Boolean(
    conversationId && workspace.previewResourceId && !pendingExpandFromResource
  );
  const showRoutePage =
    !previewingCitation ||
    (workspace.view === 'conversation' &&
      workspace.conversationId === conversationId);
  // Workspace already provides p-2 + gap-2 beside the citation preview.
  const besideCitationPreview = previewingCitation && workspace.open;

  return (
    <SidebarInset
      className={cn(
        'min-h-0 !min-h-0 max-h-full min-w-0 h-full overflow-hidden bg-white dark:bg-background md:rounded-2xl',
        besideCitationPreview
          ? 'm-0 rounded-none md:h-full'
          : 'm-0 rounded-none md:m-[8px] md:h-[calc(100svh-16px)]'
      )}
    >
      <Header />
      {showRoutePage ? (
        <div className="flex min-h-0 max-h-full min-w-0 flex-1 flex-col overflow-hidden">
          <ChatRouteParamsProvider
            compact={besideCitationPreview}
            conversationId={conversationId}
            namespaceId={namespaceId}
          >
            <Page />
          </ChatRouteParamsProvider>
        </div>
      ) : (
        <CopilotView namespaceId={namespaceId} />
      )}
    </SidebarInset>
  );
}
