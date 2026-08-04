import { useParams } from 'react-router-dom';

import { SidebarInset } from '@/components/ui/Sidebar';
import { cn } from '@/lib/utils';
import {
  getCopilotWorkspace,
  useCopilotStore,
} from '@/page/copilot/copilotStore';
import CopilotView from '@/page/copilot/CopilotView';

import Page from './ChatPage';
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

  return (
    <SidebarInset className="m-0 min-w-0 overflow-hidden bg-white rounded-none md:m-[8px] md:rounded-2xl dark:bg-background min-h-0 h-full md:h-[calc(100svh-16px)]">
      <Header />
      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-1 flex-col',
          !showRoutePage && 'hidden'
        )}
      >
        <Page />
      </div>
      {!showRoutePage && <CopilotView namespaceId={namespaceId} />}
    </SidebarInset>
  );
}
