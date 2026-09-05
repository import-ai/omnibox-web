import './resourceComments.css';

import { ListFilter, MessageSquareText, PanelRight } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Spinner } from '@/components/ui/Spinner';
import CopilotToggleButton from '@/page/copilot/CopilotToggleButton';

import { ResourceCommentComposer } from './ResourceCommentComposer';
import { useResourceCommentsPanel } from './ResourceCommentsContext';
import { ResourceCommentThreadItem } from './ResourceCommentThreadItem';
import type { ResourceCommentsController } from './useResourceComments';

interface ResourceCommentsSheetProps {
  controller: ResourceCommentsController;
}

export function ResourceCommentsSheet({
  controller,
}: ResourceCommentsSheetProps) {
  const { t } = useTranslation();
  const panel = useResourceCommentsPanel();
  const close = () => {
    controller.setPanelOpen(false);
    controller.setActiveThreadId(null);
  };
  const loadMore = () => {
    controller.loadMore().catch(() => undefined);
  };
  const filter =
    controller.resolved === undefined
      ? 'all'
      : controller.resolved
        ? 'resolved'
        : 'open';
  const filterLabel = t('resource_comments.all_title');
  const changeFilter = (value: string) => {
    controller.setResolved(value === 'all' ? undefined : value === 'resolved');
  };
  const content = (
    <>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              aria-label={t('resource_comments.collapse')}
              onClick={close}
            >
              <PanelRight className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('resource_comments.collapse')}</TooltipContent>
        </Tooltip>
        <h2 className="min-w-0 flex-1 truncate text-sm font-medium">
          {t('resource_comments.panel_title', { count: controller.total })}
        </h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label={filterLabel}
              title={filterLabel}
            >
              <ListFilter className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup value={filter} onValueChange={changeFilter}>
              <DropdownMenuRadioItem value="all">
                {t('resource_comments.all_title')}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="open">
                {t('resource_comments.open')}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="resolved">
                {t('resource_comments.resolved')}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        {panel && !panel.namespaceId.startsWith('share:') && (
          <CopilotToggleButton namespaceId={panel.namespaceId} />
        )}
      </header>
      {controller.contentDirty && (
        <p className="border-b bg-muted px-4 py-2 text-xs text-muted-foreground">
          {t('resource_comments.save_before_commenting')}
        </p>
      )}
      <div
        data-comments-scroll
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {controller.loading ? (
          <div className="flex h-40 items-center justify-center">
            <Spinner />
          </div>
        ) : controller.threads.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center px-6 text-center text-sm text-muted-foreground">
            <MessageSquareText className="mb-3 size-6" />
            {t(
              controller.resolved === undefined
                ? 'resource_comments.no_threads'
                : controller.resolved
                  ? 'resource_comments.no_resolved_threads'
                  : 'resource_comments.no_open_threads'
            )}
          </div>
        ) : (
          controller.threads.map(thread => (
            <ResourceCommentThreadItem
              key={thread.id}
              controller={controller}
              mode="all"
              thread={thread}
            />
          ))
        )}
        {controller.hasMore && (
          <div className="p-4">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={controller.loadingMore}
              onClick={loadMore}
            >
              {t('resource_comments.load_more')}
            </Button>
          </div>
        )}
      </div>
    </>
  );
  return (
    <>
      <ResourceCommentComposer controller={controller} />
      {panel?.panelElement && controller.panelOpen
        ? createPortal(content, panel.panelElement)
        : null}
    </>
  );
}
