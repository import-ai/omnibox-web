import {
  Check,
  ChevronDown,
  ChevronUp,
  Image,
  Link2,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog';
import { Textarea } from '@/components/ui/Textarea';
import type {
  ResourceComment,
  ResourceCommentAttachment,
  ResourceCommentThread,
} from '@/interface';

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
      if (threadElement?.dataset.threadId === thread.id) {
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
    } catch {
      // The request layer displays the server error.
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
      controller.focusThread(thread.id);
      setReplying(true);
    }
  };

  return (
    <article
      className="omnibox-comment-thread"
      data-thread-id={thread.id}
      data-selected={active || undefined}
      data-resolved={thread.resolved || undefined}
      onClick={handleThreadClick}
    >
      {mode === 'all' ? (
        <div className="omnibox-comment-thread__quote-row">
          <button type="button" className="omnibox-comment-thread__quote">
            <span>{t('resource_comments.quote_label')}</span>
            <q>{thread.quoted_text}</q>
          </button>
          <div
            className="omnibox-comment-thread__toolbar"
            aria-label={t('resource_comments.thread_actions')}
            onClick={event => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label={t('resource_comments.next_thread')}
              title={t('resource_comments.next_thread')}
              disabled={!nextThreadId}
              onClick={() => {
                if (nextThreadId) {
                  controller.focusThread(nextThreadId);
                }
              }}
            >
              <ChevronDown aria-hidden="true" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              aria-label={t('resource_comments.previous_thread')}
              title={t('resource_comments.previous_thread')}
              disabled={!previousThreadId}
              onClick={() => {
                if (previousThreadId) {
                  controller.focusThread(previousThreadId);
                }
              }}
            >
              <ChevronUp aria-hidden="true" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              aria-label={t('resource_comments.copy_thread_link')}
              title={t('resource_comments.copy_thread_link')}
              onClick={handleCopyLink}
            >
              <Link2 aria-hidden="true" strokeWidth={1.75} />
            </button>
            {controller.canModerateThread(thread) ? (
              <button
                type="button"
                aria-label={
                  thread.resolved
                    ? t('resource_comments.reopen')
                    : t('resource_comments.resolve')
                }
                title={
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
            ) : null}
          </div>
        </div>
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
            threadResolved={thread.resolved}
            controller={controller}
            onEditingChange={editing =>
              setEditingCommentId(editing ? comment.id : null)
            }
          />
        ))}
      </div>

      {mode === 'thread' && !thread.resolved && controller.canComment ? (
        <FigmaReplyComposer
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
        <FigmaReplyComposer
          author={currentAuthor}
          reply={reply}
          submitting={controller.submitting}
          onCancel={closeReply}
          onChange={setReply}
          onSubmit={submitReply}
          onUploadImage={controller.uploadCommentImage}
        />
      ) : null}
    </article>
  );
}

function FigmaReplyComposer({
  author,
  reply,
  submitting,
  onCancel,
  onChange,
  onSubmit,
  onUploadImage,
}: {
  author?: string | null;
  reply: string;
  submitting: boolean;
  onCancel: () => void;
  onChange: (value: string) => void;
  onSubmit: (attachmentIds?: string[]) => Promise<void>;
  onUploadImage: (file: File) => Promise<ResourceCommentAttachment>;
}) {
  const { t } = useTranslation();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [attachmentId, setAttachmentId] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const hasDraft = Boolean(reply.trim() || attachmentId);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const clearImage = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setImagePreview(null);
    setAttachmentId(null);
  };

  const submitDraft = () => {
    if (submitting || !hasDraft) {
      return;
    }
    onSubmit(attachmentId ? [attachmentId] : undefined)
      .then(clearImage)
      .catch(() => undefined);
  };

  return (
    <div
      className="omnibox-comment-reply"
      data-has-draft={hasDraft ? '' : undefined}
    >
      <CommentAvatar author={author} />
      <div
        className="omnibox-comment-reply__input"
        data-has-preview={imagePreview ? '' : undefined}
      >
        <Textarea
          autoFocus
          className="border-line"
          maxLength={10000}
          placeholder={t('resource_comments.reply_placeholder')}
          rows={1}
          value={reply}
          onChange={event => onChange(event.target.value)}
          onKeyDown={event => {
            if (event.key !== 'Enter' || event.nativeEvent.isComposing) {
              return;
            }
            if (event.shiftKey) {
              return;
            }
            event.preventDefault();
            if (event.repeat) {
              return;
            }
            submitDraft();
          }}
        />
        {imagePreview ? (
          <div className="omnibox-comment-reply__preview">
            <img src={imagePreview} alt="" />
            <button
              type="button"
              aria-label={t('resource_comments.remove_image')}
              title={t('resource_comments.remove_image')}
              onClick={clearImage}
            >
              <X aria-hidden="true" strokeWidth={2} />
            </button>
          </div>
        ) : null}
        <label
          className="omnibox-comment-reply__attach"
          aria-label={t('resource_comments.attach_image')}
          title={t('resource_comments.attach_image')}
        >
          <Image
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
          />
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={submitting}
            onChange={event => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) {
                return;
              }
              if (previewUrlRef.current) {
                URL.revokeObjectURL(previewUrlRef.current);
              }
              const url = URL.createObjectURL(file);
              previewUrlRef.current = url;
              setImagePreview(url);
              onUploadImage(file)
                .then(uploaded => {
                  setAttachmentId(uploaded.id);
                })
                .catch(() => {
                  clearImage();
                });
            }}
          />
        </label>
      </div>
      <div className="omnibox-comment-reply__actions">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={submitting}
          onClick={() => {
            clearImage();
            onCancel();
          }}
        >
          {t('resource_comments.cancel')}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={submitting || !hasDraft}
          onClick={submitDraft}
        >
          {t('resource_comments.reply')}
        </Button>
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  threadId,
  threadResolved,
  controller,
  onEditingChange,
}: {
  comment: ResourceComment;
  threadId: string;
  threadResolved: boolean;
  controller: ResourceCommentsController;
  onEditingChange?: (editing: boolean) => void;
}) {
  const { i18n, t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(comment.content);
  const [editImages, setEditImages] = useState<
    Array<{ id: string; url: string }>
  >([]);
  const pendingUrlRef = useRef<string | null>(null);
  const author = comment.author.username || t('resource_comments.deleted_user');

  const canEdit = !threadResolved && controller.canEditComment(comment);
  const canSaveEdit = Boolean(
    content.trim() || editImages.some(image => image.id)
  );

  const commentImages = () =>
    (comment.attachments ?? [])
      .filter(item => item.mimetype.startsWith('image/'))
      .map(item => ({ id: item.id, url: item.url }));

  const clearPendingUrl = () => {
    if (pendingUrlRef.current) {
      URL.revokeObjectURL(pendingUrlRef.current);
      pendingUrlRef.current = null;
    }
  };

  const startEditing = () => {
    setContent(comment.content);
    setEditImages(commentImages());
    setEditing(true);
    onEditingChange?.(true);
  };

  const exitEditing = () => {
    setContent(comment.content);
    clearPendingUrl();
    setEditImages(commentImages());
    setEditing(false);
    onEditingChange?.(false);
  };

  useEffect(() => {
    return () => {
      clearPendingUrl();
    };
  }, []);

  useEffect(() => {
    if (!threadResolved || !editing) {
      return;
    }
    exitEditing();
  }, [editing, threadResolved]);

  const submitEdit = async () => {
    if (!canSaveEdit || threadResolved) {
      return;
    }
    try {
      await controller.editComment(
        threadId,
        comment.id,
        content,
        editImages.map(image => image.id).filter(Boolean)
      );
      clearPendingUrl();
      setEditing(false);
      onEditingChange?.(false);
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
            {new Date(comment.updated_at).getTime() -
              new Date(comment.created_at).getTime() >
            1000 ? (
              <span className="omnibox-comment-message__edited">
                {t('resource_comments.edited')}
              </span>
            ) : null}
          </div>
          {canEdit || controller.canDeleteComment(comment) ? (
            <div className="omnibox-comment-message__meta">
              {canEdit && (
                <button
                  type="button"
                  className="omnibox-comment-message__action"
                  title={t('resource_comments.edit')}
                  aria-label={t('resource_comments.edit')}
                  disabled={controller.submitting}
                  onClick={event => {
                    event.stopPropagation();
                    startEditing();
                  }}
                >
                  <Pencil aria-hidden="true" />
                </button>
              )}
              {controller.canDeleteComment(comment) && (
                <button
                  type="button"
                  className="omnibox-comment-message__action"
                  title={t('resource_comments.delete')}
                  aria-label={t('resource_comments.delete')}
                  disabled={controller.submitting}
                  onClick={event => {
                    event.stopPropagation();
                    controller
                      .removeComment(threadId, comment.id)
                      .catch(() => undefined);
                  }}
                >
                  <Trash2 aria-hidden="true" />
                </button>
              )}
            </div>
          ) : null}
        </div>
        {editing ? (
          <div
            className="omnibox-comment-composer--edit"
            onClick={event => event.stopPropagation()}
            onPointerDown={event => event.stopPropagation()}
          >
            <div
              className="omnibox-comment-composer--edit__input"
              data-has-preview={editImages.length ? '' : undefined}
            >
              <Textarea
                autoFocus
                className="border-line"
                maxLength={10000}
                rows={2}
                value={content}
                onChange={event => setContent(event.target.value)}
              />
              {editImages.length ? (
                <div className="omnibox-comment-composer--edit__preview">
                  {editImages.map(image => (
                    <div key={image.id || image.url}>
                      <img src={image.url} alt="" />
                      <button
                        type="button"
                        aria-label={t('resource_comments.remove_image')}
                        title={t('resource_comments.remove_image')}
                        onClick={() => {
                          if (pendingUrlRef.current === image.url) {
                            clearPendingUrl();
                          }
                          setEditImages(current =>
                            current.filter(item => item.url !== image.url)
                          );
                        }}
                      >
                        <X aria-hidden="true" strokeWidth={2} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <label
                className="omnibox-comment-composer--edit__attach"
                aria-label={t('resource_comments.attach_image')}
                title={t('resource_comments.attach_image')}
              >
                <Image
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                />
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={controller.submitting}
                  onChange={event => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (!file) {
                      return;
                    }
                    clearPendingUrl();
                    const url = URL.createObjectURL(file);
                    pendingUrlRef.current = url;
                    setEditImages(current => [...current, { id: '', url }]);
                    controller
                      .uploadCommentImage(file)
                      .then(uploaded => {
                        setEditImages(current =>
                          current.map(item =>
                            item.url === url ? { id: uploaded.id, url } : item
                          )
                        );
                      })
                      .catch(() => {
                        if (pendingUrlRef.current === url) {
                          clearPendingUrl();
                        }
                        setEditImages(current =>
                          current.filter(item => item.url !== url)
                        );
                      });
                  }}
                />
              </label>
            </div>
            <div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={controller.submitting}
                onClick={exitEditing}
              >
                {t('resource_comments.cancel')}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!canSaveEdit || controller.submitting}
                onClick={() => {
                  submitEdit().catch(() => undefined);
                }}
              >
                {t('resource_comments.save')}
              </Button>
            </div>
          </div>
        ) : (
          <CommentBody
            content={comment.content}
            attachments={comment.attachments}
          />
        )}
      </div>
    </div>
  );
}

function CommentBody({
  content,
  attachments,
}: {
  content: string;
  attachments?: ResourceCommentAttachment[];
}) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<ResourceCommentAttachment | null>(
    null
  );
  const images = (attachments ?? []).filter(item =>
    item.mimetype.startsWith('image/')
  );
  return (
    <div className="omnibox-comment-message__content">
      {content.trim() ? <p>{content}</p> : null}
      {images.map(image => (
        <button
          key={image.id}
          type="button"
          className="omnibox-comment-message__image-button"
          onClick={event => {
            event.stopPropagation();
            setPreview(image);
          }}
        >
          <img
            src={image.url}
            alt={image.name}
            className="omnibox-comment-message__image"
          />
        </button>
      ))}
      <Dialog
        open={!!preview}
        onOpenChange={open => {
          if (!open) {
            setPreview(null);
          }
        }}
      >
        <DialogContent
          className="omnibox-comment-image-preview max-w-[min(90vw,56rem)] border-0 bg-transparent p-0 shadow-none outline-none"
          onClick={event => event.stopPropagation()}
        >
          <DialogTitle className="sr-only">
            {preview?.name || t('resource_comments.preview_image')}
          </DialogTitle>
          {preview ? (
            <img
              src={preview.url}
              alt={preview.name}
              className="max-h-[85vh] w-full rounded-md object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>
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
