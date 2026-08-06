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
  const previewingCitation = Boolean(workspace.previewResourceId);
  const showRoutePage =
    !previewingCitation ||
    (workspace.view === 'conversation' &&
      workspace.conversationId === conversationId);
  // Workspace already provides p-2 + gap-2 beside the citation preview.
  const besideCitationPreview = previewingCitation && workspace.open;

  return (
    <SidebarInset
      className={cn(
        'min-w-0 overflow-hidden bg-white dark:bg-background min-h-0 h-full md:rounded-2xl',
        besideCitationPreview
          ? 'm-0 rounded-none md:h-full'
          : 'm-0 rounded-none md:m-[8px] md:h-[calc(100svh-16px)]'
      )}
    >
      <Header />
      {/* Keep the route conversation mounted while Copilot home/history overlays
          it, so streaming / scroll state survives showHome / showHistory. */}
      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-1 flex-col',
          !showRoutePage && 'hidden'
        )}
      >
        <ChatRouteParamsProvider
          compact={besideCitationPreview}
          conversationId={conversationId}
          namespaceId={namespaceId}
        >
          <Page />
        </ChatRouteParamsProvider>
      </div>
      {!showRoutePage && <CopilotView namespaceId={namespaceId} />}
    </SidebarInset>
  );
}
