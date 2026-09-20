import { History } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { SidebarTriggerButton } from '@/components/SidebarTriggerButton';
import { Button } from '@/components/ui/Button';
import { useSidebar } from '@/components/ui/Sidebar';
import { cn } from '@/lib/utils';
import {
  getCopilotWorkspace,
  useCopilotStore,
} from '@/page/copilot/copilotStore';
import CopilotToggleButton from '@/page/copilot/CopilotToggleButton';
import { useResourceCommentsPanel } from '@/page/resource/comments/ResourceCommentsContext';
import { ResourceCommentsToggleButton } from '@/page/resource/comments/ResourceCommentsToggleButton';

import Actions, { IActionProps } from '../actions';
import { selectUseOmniboxEditor, useResourceStore } from '../resourceStore';
import Breadcrumb from './BreadcrumbMain';

export default function Header(props: IActionProps) {
  const { resource, namespaceId } = props;
  const { t } = useTranslation();
  const showResourceHistory = useCopilotStore(
    state => state.showResourceHistory
  );
  const copilotWorkspace = useCopilotStore(state =>
    getCopilotWorkspace(state, namespaceId)
  );
  const commentsPanel = useResourceCommentsPanel();
  const { open } = useSidebar();
  const useOmniboxEditor = useResourceStore(selectUseOmniboxEditor);
  const isFolder =
    resource?.resource_type === 'folder' ||
    resource?.resource_type === 'smart_folder' ||
    resource?.resource_type === 'rss_folder';
  const commentsActive = !!commentsPanel?.panelOpen;
  const historyActive =
    copilotWorkspace.open &&
    !commentsActive &&
    copilotWorkspace.view === 'resource_history';
  const copilotActive =
    copilotWorkspace.open && !commentsActive && !historyActive;

  return (
    <header className="flex min-h-[48px] min-w-0 shrink-0 items-center gap-2 overflow-hidden rounded-[16px] bg-white dark:bg-background">
      <div className="flex min-w-0 flex-1 items-center gap-1 px-3 sm:gap-2">
        <SidebarTriggerButton collapse />
        <Breadcrumb
          namespaceId={namespaceId}
          path={resource?.path}
          className={cn('min-w-0', {
            'ml-2': open,
          })}
        />
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1 pr-3">
        <Actions {...props} />
        {resource && useOmniboxEditor && !isFolder && !commentsActive ? (
          <ResourceCommentsToggleButton />
        ) : null}
        {resource?.resource_type === 'doc' &&
        !resource.read_only &&
        !props.editPage &&
        !historyActive ? (
          <Button
            aria-label={t('resource.history.open')}
            className="h-7 w-7 shrink-0"
            onClick={() => {
              commentsPanel?.setPanelOpen(false);
              showResourceHistory(namespaceId, resource.id);
            }}
            size="icon"
            type="button"
            variant="ghost"
          >
            <History />
          </Button>
        ) : null}
        {resource && !copilotActive ? (
          <CopilotToggleButton namespaceId={namespaceId} />
        ) : null}
      </div>
    </header>
  );
}
