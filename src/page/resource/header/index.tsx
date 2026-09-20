import { Eye, History, RotateCcw } from 'lucide-react';
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
import {
  setResourceRevisionQuery,
  useResourceHistoryStore,
} from '../history/resourceHistoryStore';
import { selectUseOmniboxEditor, useResourceStore } from '../resourceStore';
import Breadcrumb from './BreadcrumbMain';

export default function Header(props: IActionProps) {
  const {
    onRestore,
    onViewCurrent,
    resource,
    namespaceId,
    isHistorical = false,
    restoring = false,
  } = props;
  const { t, i18n } = useTranslation();
  const selectedRevision = useResourceHistoryStore(
    state => state.selections[`${namespaceId}:${resource?.id}`]
  );
  const clearRevision = useResourceHistoryStore(state => state.clearRevision);
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
  const historyRevision = isHistorical ? selectedRevision : null;
  const viewCurrent = () => {
    if (onViewCurrent) {
      onViewCurrent();
      return;
    }
    if (resource) {
      clearRevision(namespaceId, resource.id);
      setResourceRevisionQuery(null);
    }
  };

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
        {historyRevision ? (
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <span className="hidden max-w-[18rem] truncate font-medium text-muted-foreground md:inline-block">
              {t('resource.history.historical_version')} ·{' '}
              {new Intl.DateTimeFormat(
                i18n?.language?.startsWith('zh') ? 'zh-CN' : 'en-US',
                {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }
              ).format(new Date(historyRevision.created_at))}
              {historyRevision.author
                ? ` · ${historyRevision.author.username}`
                : ''}
            </span>
            <Button
              onClick={viewCurrent}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Eye />
              {t('resource.history.back_to_current')}
            </Button>
            {onRestore ? (
              <Button
                disabled={restoring}
                onClick={onRestore}
                size="sm"
                type="button"
                variant="ghost"
              >
                <RotateCcw />
                {t('resource.history.restore')}
              </Button>
            ) : null}
          </div>
        ) : null}
        <Actions {...props} />
        {resource &&
        !isHistorical &&
        useOmniboxEditor &&
        !isFolder &&
        !commentsActive ? (
          <ResourceCommentsToggleButton />
        ) : null}
        {resource?.resource_type === 'doc' &&
        (!resource.read_only || isHistorical) &&
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
        {resource && !isHistorical && !copilotActive ? (
          <CopilotToggleButton namespaceId={namespaceId} />
        ) : null}
      </div>
    </header>
  );
}
