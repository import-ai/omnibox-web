import { Check, Link2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

import { ResourceCommentInput } from './ResourceCommentInput';
import { ResourceCommentItem } from './ResourceCommentItem';
import type { ResourceCommentsController } from './useResourceComments';

export function ResourceDocumentComments({
  controller,
  wide = false,
}: {
  controller: ResourceCommentsController;
  wide?: boolean;
}) {
  const { t } = useTranslation();
  const draft = controller.documentDraft;
  const hasDraft = draft.hasDraft || draft.uploading;
  const submit = async () => {
    if (!controller.documentSubmitting && !draft.uploading && draft.hasDraft)
      await controller.submitDocumentDraft();
  };
  return (
    <section
      className={cn(
        'resource-document-comments resource-comments-panel resource-readonly-page-header',
        wide && 'resource-readonly-page-header--wide'
      )}
      aria-label={t('resource_comments.document_title')}
    >
      <div
        data-resource-body-end
        className={'resource-document-comments__boundary'}
        aria-hidden
      />
      {controller.documentThreads.length > 0 ? (
        <>
          <h1 className={'mb-4 text-xl font-semibold'}>
            {t('resource_comments.document_title')}
          </h1>
          <div className={'resource-document-comments__list'}>
            {controller.documentThreads.map(thread => (
              <article
                key={thread.id}
                data-document-comment-id={thread.id}
                className={'resource-document-comment'}
              >
                <div className={'resource-document-comment__toolbar-row'}>
                  <div
                    className={'omnibox-comment-thread__toolbar'}
                    aria-label={t('resource_comments.thread_actions')}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type={'button'}
                          aria-label={t('resource_comments.copy_thread_link')}
                          onClick={() => {
                            const url = new URL(window.location.href);
                            url.hash = 'comment-' + thread.id;
                            navigator.clipboard
                              ?.writeText(url.toString())
                              .then(() =>
                                toast(t('actions.copy_link_success'), {
                                  position: 'bottom-right',
                                })
                              )
                              .catch(() => undefined);
                          }}
                        >
                          <Link2 aria-hidden strokeWidth={1.75} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {t('resource_comments.copy_thread_link')}
                      </TooltipContent>
                    </Tooltip>
                    {controller.canModerateThread(thread) ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type={'button'}
                            className={'omnibox-comment-thread__resolve'}
                            aria-label={t('resource_comments.resolve_and_hide')}
                            disabled={controller.submitting}
                            onClick={() => {
                              controller
                                .setThreadResolved(thread.id, true)
                                .catch(() => undefined);
                            }}
                          >
                            <Check aria-hidden strokeWidth={1.75} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {t('resource_comments.resolve_and_hide')}
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                  </div>
                </div>
                {thread.comments.map(comment => (
                  <ResourceCommentItem
                    key={comment.id}
                    comment={comment}
                    threadId={thread.id}
                    threadResolved={false}
                    thread={thread}
                    controller={controller}
                  />
                ))}
              </article>
            ))}
          </div>
          {controller.documentHasMore ? (
            <Button
              type={'button'}
              variant={'outline'}
              disabled={controller.documentLoadingMore}
              className={'my-3'}
              onClick={() => {
                controller.loadMoreDocumentThreads().catch(() => undefined);
              }}
            >
              {t('resource_comments.load_more')}
            </Button>
          ) : null}
        </>
      ) : null}
      {controller.canComment ? (
        <div
          className={
            'omnibox-comment-surface resource-document-comments__composer'
          }
        >
          <form
            className={'omnibox-comment-composer'}
            data-has-draft={hasDraft ? '' : undefined}
            onSubmit={event => {
              event.preventDefault();
              submit().catch(() => undefined);
            }}
          >
            <ResourceCommentInput
              draft={draft}
              disabled={controller.documentSubmitting}
              onSubmit={submit}
            />
            {hasDraft ? (
              <div className={'omnibox-comment-composer__actions'}>
                <Button
                  type={'button'}
                  size={'sm'}
                  variant={'outline'}
                  data-comment-cancel
                  disabled={controller.documentSubmitting}
                  onClick={draft.clear}
                >
                  {t('resource_comments.cancel')}
                </Button>
                <Button
                  type={'submit'}
                  size={'sm'}
                  className={'omnibox-comment-submit'}
                  disabled={
                    controller.documentSubmitting ||
                    draft.uploading ||
                    !draft.hasDraft
                  }
                >
                  {t('resource_comments.comment')}
                </Button>
              </div>
            ) : null}
          </form>
        </div>
      ) : null}
    </section>
  );
}
