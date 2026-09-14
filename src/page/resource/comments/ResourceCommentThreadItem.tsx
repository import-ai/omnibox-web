import { Check, ChevronDown, ChevronUp, Link2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import type { ResourceCommentThread } from '@/interface';

import { ResourceCommentItem } from './ResourceCommentItem';
import { ResourceCommentReplyComposer } from './ResourceCommentReplyComposer';
import type { ResourceCommentsController } from './useResourceComments';

interface ResourceCommentThreadItemProps {
  controller: ResourceCommentsController;
  mode: 'thread' | 'all';
  orderedThreadIds?: string[];
  thread: ResourceCommentThread;
}

export function ResourceCommentThreadItem({
  controller,
  mode,
  orderedThreadIds,
  thread,
}: ResourceCommentThreadItemProps) {
  const { t } = useTranslation();
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const active = controller.activeThreadId === thread.id;
  const setActiveThreadId = controller.setActiveThreadId;
  const currentAuthor = thread.comments.find(
    comment => comment.author.id === controller.currentUserId
  )?.author.username;

  useEffect(() => {
    if (!active) {
      setReplying(false);
      setReply('');
      setEditingCommentId(null);
    }
  }, [active]);

  useEffect(() => {
    if (
      active &&
      controller.navigatingReplyThreadId === thread.id &&
      !thread.resolved &&
      controller.canComment
    ) {
      setReplying(true);
    }
  }, [
    active,
    controller.navigatingReplyThreadId,
    controller.canComment,
    thread.id,
    thread.resolved,
  ]);

  useEffect(() => {
    if (!active) {
      return;
    }
    const handleOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const threadElement = target.closest<HTMLElement>(
        '.omnibox-comment-thread'
      );
      if (threadElement) {
        return;
      }
      setReplying(false);
      setEditingCommentId(null);
      setActiveThreadId(null);
    };
    document.addEventListener('pointerdown', handleOutsidePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointerDown);
    };
  }, [active, setActiveThreadId, thread.id]);

  const closeReply = () => {
    setReply('');
    setReplying(false);
    setActiveThreadId(null);
  };

  const submitReply = async (attachmentIds?: string[]) => {
    if (!reply.trim() && !attachmentIds?.length) {
      return;
    }
    try {
      await controller.reply(thread.id, reply, attachmentIds);
      setReply('');
      setReplying(false);
    } catch (error) {
      // The request layer displays the server error. Preserve the draft for retry.
      throw error;
    }
  };

  const handleCopyLink = () => {
    if (!navigator.clipboard) {
      return;
    }
    const url = new URL(window.location.href);
    url.hash = `comment-${thread.id}`;
    navigator.clipboard
      .writeText(url.toString())
      .then(() => {
        toast(t('actions.copy_link_success'), { position: 'bottom-right' });
      })
      .catch(() => {
        toast(t('actions.copy_link_failed'), { position: 'bottom-right' });
      });
  };

  const navigationIds =
    orderedThreadIds ?? controller.threads.map(item => item.id);
  const threadIndex = navigationIds.indexOf(thread.id);
  const nextThreadId =
    threadIndex >= 0 ? navigationIds[threadIndex + 1] : undefined;
  const previousThreadId =
    threadIndex > 0 ? navigationIds[threadIndex - 1] : undefined;

  const handleThreadClick = () => {
    if (!active) {
      controller.selectThread(thread.id);
    }
    if (!thread.resolved && controller.canComment && !editingCommentId) {
      setReplying(true);
    }
  };

  const handleQuoteClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    handleThreadClick();
  };

  return (
    <article
      className="omnibox-comment-thread"
      data-thread-id={thread.id}
      data-selected={active || undefined}
      data-resolved={thread.resolved || undefined}
      data-editing={editingCommentId || undefined}
      data-submitting={controller.submitting || undefined}
      onClick={handleThreadClick}
    >
      {mode === 'all' ? (
        <div className="omnibox-comment-thread__quote-row">
          <button
            type="button"
            className="omnibox-comment-thread__quote"
            onClick={handleQuoteClick}
          >
            <span>{t('resource_comments.quote_label')}</span>
            <q>{thread.quoted_text}</q>
          </button>
          <div
            className="omnibox-comment-thread__toolbar"
            aria-label={t('resource_comments.thread_actions')}
            onClick={event => event.stopPropagation()}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={t('resource_comments.next_thread')}
                  disabled={!nextThreadId}
                  onClick={() => {
                    if (nextThreadId) {
                      controller.focusThread(nextThreadId, { align: 'start' });
                    }
                  }}
                >
                  <ChevronDown aria-hidden="true" strokeWidth={1.75} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {t('resource_comments.next_thread')}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={t('resource_comments.previous_thread')}
                  disabled={!previousThreadId}
                  onClick={() => {
                    if (previousThreadId) {
                      controller.focusThread(previousThreadId, {
                        align: 'start',
                      });
                    }
                  }}
                >
                  <ChevronUp aria-hidden="true" strokeWidth={1.75} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {t('resource_comments.previous_thread')}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={t('resource_comments.copy_thread_link')}
                  onClick={handleCopyLink}
                >
                  <Link2 aria-hidden="true" strokeWidth={1.75} />
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
                    type="button"
                    className="omnibox-comment-thread__resolve"
                    aria-label={
                      thread.resolved
                        ? t('resource_comments.reopen')
                        : t('resource_comments.resolve')
                    }
                    disabled={controller.submitting}
                    onClick={() => {
                      controller
                        .setThreadResolved(thread.id, !thread.resolved)
                        .catch(() => undefined);
                    }}
                  >
                    <Check aria-hidden="true" strokeWidth={1.75} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {thread.resolved
                    ? t('resource_comments.reopen')
                    : t('resource_comments.resolve')}
                </TooltipContent>
              </Tooltip>
            ) : thread.resolved ? (
              <span
                className="omnibox-comment-thread__resolve"
                role="img"
                aria-label={t('resource_comments.resolved')}
              >
                <Check aria-hidden="true" strokeWidth={1.75} />
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {thread.anchor.status === 'orphaned' ? (
        <span className="omnibox-comment-thread__orphaned">
          {t('resource_comments.original_text_removed')}
        </span>
      ) : null}

      <div className="omnibox-comment-thread__messages">
        {thread.comments.map(comment => (
          <ResourceCommentItem
            key={comment.id}
            comment={comment}
            threadId={thread.id}
            threadResolved={thread.resolved}
            controller={controller}
            onEditingChange={editing =>
              setEditingCommentId(editing ? comment.id : null)
            }
          />
        ))}
      </div>

      {mode === 'thread' && !thread.resolved && controller.canComment ? (
        <ResourceCommentReplyComposer
          author={currentAuthor}
          reply={reply}
          submitting={controller.submitting}
          onCancel={closeReply}
          onChange={setReply}
          onSubmit={submitReply}
          onUploadImage={controller.uploadCommentImage}
        />
      ) : null}

      {mode === 'all' &&
      active &&
      replying &&
      !editingCommentId &&
      !thread.resolved &&
      controller.canComment ? (
        <div className="omnibox-comment-reply-reveal">
          <div className="omnibox-comment-reply-reveal__content">
            <ResourceCommentReplyComposer
              author={currentAuthor}
              reply={reply}
              submitting={controller.submitting}
              onCancel={closeReply}
              onChange={setReply}
              onSubmit={submitReply}
              onUploadImage={controller.uploadCommentImage}
            />
          </div>
        </div>
      ) : null}
    </article>
  );
}
