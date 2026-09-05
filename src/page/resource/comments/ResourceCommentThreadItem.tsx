import { ArrowUp, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ResourceComment, ResourceCommentThread } from '@/interface';

import type { ResourceCommentsController } from './useResourceComments';

interface ResourceCommentThreadItemProps {
  controller: ResourceCommentsController;
  mode: 'thread' | 'all';
  thread: ResourceCommentThread;
}

export function ResourceCommentThreadItem({
  controller,
  mode,
  thread,
}: ResourceCommentThreadItemProps) {
  const { t } = useTranslation();
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState('');
  const active = controller.activeThreadId === thread.id;
  const currentAuthor = thread.comments.find(
    comment => comment.author.id === controller.currentUserId
  )?.author.username;

  const submitReply = async () => {
    const content = reply.trim();
    if (!content) {
      return;
    }
    try {
      await controller.reply(thread.id, content);
      setReply('');
      setReplying(false);
    } catch {
      // The request layer displays the server error.
    }
  };

  const handleSubmitReply = () => {
    submitReply().catch(() => undefined);
  };

  return (
    <article
      className="omnibox-comment-thread"
      data-selected={active || undefined}
      data-resolved={thread.resolved || undefined}
    >
      {mode === 'all' ? (
        <button
          type="button"
          className="omnibox-comment-thread__quote"
          onClick={() => controller.focusThread(thread.id)}
        >
          <span>{t('resource_comments.quote_label')}</span>
          <q>{thread.quoted_text}</q>
        </button>
      ) : null}

      {thread.anchor.status === 'orphaned' ? (
        <span className="omnibox-comment-thread__orphaned">
          {t('resource_comments.original_text_removed')}
        </span>
      ) : thread.resolved ? (
        <span className="omnibox-comment-thread__status">
          {t('resource_comments.resolved')}
        </span>
      ) : null}

      <div className="omnibox-comment-thread__messages">
        {thread.comments.map(comment => (
          <CommentItem
            key={comment.id}
            comment={comment}
            threadId={thread.id}
            controller={controller}
          />
        ))}
      </div>

      {mode === 'thread' && !thread.resolved && controller.canComment ? (
        <FigmaReplyComposer
          author={currentAuthor}
          reply={reply}
          submitting={controller.submitting}
          onChange={setReply}
          onSubmit={submitReply}
        />
      ) : null}

      {mode === 'all' && replying ? (
        <div className="omnibox-comment-composer omnibox-comment-composer--reply">
          <textarea
            autoFocus
            maxLength={10000}
            placeholder={t('resource_comments.reply_placeholder')}
            rows={2}
            value={reply}
            onChange={event => setReply(event.target.value)}
            onKeyDown={event => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault();
                handleSubmitReply();
              }
            }}
          />
          <div>
            <button type="button" onClick={() => setReplying(false)}>
              {t('resource_comments.cancel')}
            </button>
            <button
              type="button"
              disabled={!reply.trim() || controller.submitting}
              onClick={handleSubmitReply}
            >
              {t('resource_comments.reply')}
            </button>
          </div>
        </div>
      ) : mode === 'all' ? (
        <div className="omnibox-comment-thread__actions">
          {!thread.resolved && controller.canComment ? (
            <button type="button" onClick={() => setReplying(true)}>
              {t('resource_comments.reply')}
            </button>
          ) : null}
          {controller.canModerateThread(thread) ? (
            <>
              <button
                type="button"
                onClick={() => {
                  controller
                    .setThreadResolved(thread.id, !thread.resolved)
                    .catch(() => undefined);
                }}
              >
                {thread.resolved
                  ? t('resource_comments.reopen')
                  : t('resource_comments.resolve')}
              </button>
              <button
                type="button"
                onClick={() => {
                  controller.removeThread(thread.id).catch(() => undefined);
                }}
              >
                {t('resource_comments.delete')}
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function FigmaReplyComposer({
  author,
  reply,
  submitting,
  onChange,
  onSubmit,
}: {
  author?: string | null;
  reply: string;
  submitting: boolean;
  onChange: (value: string) => void;
  onSubmit: () => Promise<void>;
}) {
  const { t } = useTranslation();

  return (
    <div className="omnibox-comment-reply">
      <CommentAvatar author={author} />
      <div className="omnibox-comment-reply__input">
        <textarea
          maxLength={10000}
          placeholder={t('resource_comments.reply_placeholder')}
          rows={1}
          value={reply}
          onChange={event => onChange(event.target.value)}
          onKeyDown={event => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault();
              onSubmit().catch(() => undefined);
            }
          }}
        />
        <button
          type="button"
          className="omnibox-comment-reply__submit"
          aria-label={t('resource_comments.reply')}
          title={t('resource_comments.reply')}
          disabled={!reply.trim() || submitting}
          onClick={() => {
            onSubmit().catch(() => undefined);
          }}
        >
          <ArrowUp aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  threadId,
  controller,
}: {
  comment: ResourceComment;
  threadId: string;
  controller: ResourceCommentsController;
}) {
  const { i18n, t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(comment.content);
  const author = comment.author.username || t('resource_comments.deleted_user');

  const submitEdit = async () => {
    const value = content.trim();
    if (!value) {
      return;
    }
    try {
      await controller.editComment(threadId, comment.id, value);
      setEditing(false);
    } catch {
      // The request layer displays the server error.
    }
  };

  return (
    <div className="omnibox-comment-message">
      <CommentAvatar author={author} id={comment.author.id} />
      <div className="omnibox-comment-message__body">
        <div className="omnibox-comment-message__header">
          <div className="omnibox-comment-message__author">
            <strong>{author}</strong>
            <time dateTime={comment.updated_at}>
              {formatRelativeTime(comment.updated_at, i18n.language)}
            </time>
          </div>
          {controller.canEditComment(comment) ? (
            <div className="omnibox-comment-message__meta">
              <button
                type="button"
                className="omnibox-comment-message__action"
                title={t('resource_comments.edit')}
                onClick={() => setEditing(true)}
              >
                <Pencil aria-hidden="true" />
              </button>
              <button
                type="button"
                className="omnibox-comment-message__action"
                title={t('resource_comments.delete')}
                onClick={() => {
                  controller
                    .removeComment(threadId, comment.id)
                    .catch(() => undefined);
                }}
              >
                <Trash2 aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
        {editing ? (
          <div className="omnibox-comment-composer omnibox-comment-composer--edit">
            <textarea
              autoFocus
              maxLength={10000}
              rows={2}
              value={content}
              onChange={event => setContent(event.target.value)}
            />
            <div>
              <button
                type="button"
                onClick={() => {
                  setContent(comment.content);
                  setEditing(false);
                }}
              >
                {t('resource_comments.cancel')}
              </button>
              <button
                type="button"
                disabled={!content.trim() || controller.submitting}
                onClick={() => {
                  submitEdit().catch(() => undefined);
                }}
              >
                {t('resource_comments.save')}
              </button>
            </div>
          </div>
        ) : (
          <p>{comment.content}</p>
        )}
      </div>
    </div>
  );
}

function CommentAvatar({
  author,
  id,
}: {
  author?: string | null;
  id?: string | null;
}) {
  const label = author?.trim() || '?';
  return (
    <span
      className="omnibox-comment-avatar"
      data-tone={getAvatarTone(id || label)}
      aria-hidden="true"
    >
      {Array.from(label)[0]?.toLocaleUpperCase() || '?'}
    </span>
  );
}

function getAvatarTone(value: string) {
  let hash = 0;
  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }
  return String(Math.abs(hash) % 4);
}

function formatRelativeTime(value: string, locale: string) {
  const elapsedSeconds = (new Date(value).getTime() - Date.now()) / 1000;
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ];
  const [unit, seconds] =
    units.find(([, unitSeconds]) => Math.abs(elapsedSeconds) >= unitSeconds) ??
    units.at(-1)!;
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(
    Math.round(elapsedSeconds / seconds),
    unit
  );
}
