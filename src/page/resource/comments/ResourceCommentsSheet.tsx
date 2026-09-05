import { ResourceCommentSurface } from '@import-ai/omnibox-editor';
import { CheckCircle2, MessageSquareText, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';

import { ResourceCommentComposer } from './ResourceCommentComposer';
import { ResourceCommentThreadItem } from './ResourceCommentThreadItem';
import type { ResourceCommentsController } from './useResourceComments';

interface ResourceCommentsSheetProps {
  controller: ResourceCommentsController;
}

export function ResourceCommentsSheet({
  controller,
}: ResourceCommentsSheetProps) {
  const { t } = useTranslation();
  const activeThread = controller.activeThread;
  const mode = controller.panelOpen ? (activeThread ? 'thread' : 'all') : null;
  const displayedThreads =
    mode === 'thread' && activeThread ? [activeThread] : controller.threads;

  return (
    <>
      <ResourceCommentComposer controller={controller} />
      <ResourceCommentSurface
        mode={mode}
        title={t('resource_comments.title')}
        allTitle={t('resource_comments.all_title')}
        closeLabel={t('resource_comments.close')}
        launcherLabel={t('resource_comments.open_all')}
        count={controller.total}
        position={controller.surfacePosition}
        headerActions={
          mode === 'thread' &&
          activeThread &&
          controller.canModerateThread(activeThread) ? (
            <>
              <button
                type="button"
                className="omnibox-comment-surface__action"
                aria-label={
                  activeThread.resolved
                    ? t('resource_comments.reopen')
                    : t('resource_comments.resolve')
                }
                title={
                  activeThread.resolved
                    ? t('resource_comments.reopen')
                    : t('resource_comments.resolve')
                }
                onClick={() => {
                  controller
                    .setThreadResolved(activeThread.id, !activeThread.resolved)
                    .then(() => {
                      controller.setPanelOpen(false);
                      controller.setActiveThreadId(null);
                    })
                    .catch(() => undefined);
                }}
              >
                {activeThread.resolved ? (
                  <RotateCcw aria-hidden="true" />
                ) : (
                  <CheckCircle2 aria-hidden="true" />
                )}
              </button>
            </>
          ) : null
        }
        onClose={() => {
          controller.setPanelOpen(false);
          controller.setActiveThreadId(null);
        }}
        onOpenAll={() => {
          controller.setActiveThreadId(null);
          controller.setPanelOpen(true);
        }}
      >
        {mode === 'all' ? (
          <div className="grid grid-cols-2 border-b border-slate-200 bg-white p-1">
            {[false, true].map(value => (
              <button
                key={String(value)}
                type="button"
                className={cn(
                  'h-8 rounded-sm text-sm font-medium text-slate-500',
                  controller.resolved === value && 'bg-slate-100 text-slate-900'
                )}
                onClick={() => controller.setResolved(value)}
              >
                {value
                  ? t('resource_comments.resolved')
                  : t('resource_comments.open')}
              </button>
            ))}
          </div>
        ) : null}

        {controller.contentDirty ? (
          <p className="m-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
            {t('resource_comments.save_before_commenting')}
          </p>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {controller.loading ? (
            <div className="flex h-40 items-center justify-center">
              <Spinner />
            </div>
          ) : displayedThreads.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center px-6 text-center text-sm text-slate-500">
              <MessageSquareText className="mb-3 size-6" />
              {controller.resolved
                ? t('resource_comments.no_resolved_threads')
                : t('resource_comments.no_open_threads')}
            </div>
          ) : (
            displayedThreads.map(thread => (
              <ResourceCommentThreadItem
                key={thread.id}
                controller={controller}
                mode={mode === 'thread' ? 'thread' : 'all'}
                thread={thread}
              />
            ))
          )}
          {mode === 'all' && controller.hasMore ? (
            <div className="p-4">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={controller.loadingMore}
                onClick={() => {
                  controller.loadMore().catch(() => undefined);
                }}
              >
                {t('resource_comments.load_more')}
              </Button>
            </div>
          ) : null}
        </div>
      </ResourceCommentSurface>
    </>
  );
}
