import { Image, Pencil, Trash2, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { useAutosizeTextArea } from '@/components/autosize-textarea';
import { Button } from '@/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Textarea } from '@/components/ui/Textarea';
import type { ResourceComment } from '@/interface';

import { pasteCommentImage } from './pasteCommentImage';
import { ResourceCommentAvatar } from './ResourceCommentAvatar';
import { ResourceCommentBody } from './ResourceCommentBody';
import type { ResourceCommentsController } from './useResourceComments';

export function ResourceCommentItem({
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
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const pendingUrlsRef = useRef(new Set<string>());
  useAutosizeTextArea({
    textAreaRef: editInputRef,
    triggerAutoSize: `${editing}:${content}:${editImages.length}`,
  });
  const author = comment.author.username || t('resource_comments.deleted_user');

  const canEdit = !threadResolved && controller.canEditComment(comment);
  const uploading = editImages.some(image => !image.id);
  const canSaveEdit =
    canEdit &&
    !uploading &&
    !!(content.trim() || editImages.some(image => image.id));

  const commentImages = () =>
    (comment.attachments ?? [])
      .filter(item => item.mimetype.startsWith('image/'))
      .map(item => ({ id: item.id, url: item.url }));

  const clearPendingUrl = () => {
    for (const url of pendingUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    pendingUrlsRef.current.clear();
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

  const uploadImage = (file: File) => {
    if (
      !editing ||
      !canEdit ||
      controller.submitting ||
      !file.type.startsWith('image/')
    ) {
      return;
    }
    const url = URL.createObjectURL(file);
    pendingUrlsRef.current.add(url);
    setEditImages(current => [...current, { id: '', url }]);
    controller
      .uploadCommentImage(file)
      .then(uploaded => {
        if (!pendingUrlsRef.current.has(url)) {
          return;
        }
        setEditImages(current =>
          current.map(item =>
            item.url === url ? { id: uploaded.id, url } : item
          )
        );
      })
      .catch(() => {
        if (!pendingUrlsRef.current.delete(url)) {
          return;
        }
        URL.revokeObjectURL(url);
        toast.error(t('upload.failed'));
        setEditImages(current => current.filter(item => item.url !== url));
      });
  };

  useLayoutEffect(() => {
    if (editing && canEdit) {
      editInputRef.current?.focus({ preventScroll: true });
    }
  }, [canEdit, editing]);

  useEffect(() => {
    return () => {
      clearPendingUrl();
    };
  }, []);

  useEffect(() => {
    if (canEdit || !editing) {
      return;
    }
    exitEditing();
  }, [canEdit, editing]);

  const submitEdit = async () => {
    if (!canSaveEdit || threadResolved || controller.submitting) {
      return;
    }
    try {
      await controller.editComment(
        threadId,
        comment.id,
        content,
        editImages.map(image => image.id)
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
      <ResourceCommentAvatar author={author} id={comment.author.id} />
      <div className="omnibox-comment-message__body">
        <div className="omnibox-comment-message__header">
          <div className="omnibox-comment-message__author">
            <strong>{author}</strong>
            <span>
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
            </span>
          </div>
          {canEdit || controller.canDeleteComment(comment) ? (
            <div className="omnibox-comment-message__meta">
              {canEdit && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="omnibox-comment-message__action"
                      aria-label={t('resource_comments.edit')}
                      disabled={controller.submitting}
                      onClick={event => {
                        event.stopPropagation();
                        startEditing();
                      }}
                    >
                      <Pencil aria-hidden="true" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{t('resource_comments.edit')}</TooltipContent>
                </Tooltip>
              )}
              {controller.canDeleteComment(comment) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="omnibox-comment-message__action omnibox-comment-message__action--delete"
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
                  </TooltipTrigger>
                  <TooltipContent>
                    {t('resource_comments.delete')}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          ) : null}
        </div>
        {editing && canEdit ? (
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
                ref={editInputRef}
                className="border-line"
                maxLength={10000}
                rows={1}
                value={content}
                aria-busy={uploading}
                onChange={event => setContent(event.target.value)}
                onPaste={event => pasteCommentImage(event, uploadImage)}
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
                  submitEdit().catch(() => undefined);
                }}
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
                          if (pendingUrlsRef.current.delete(image.url)) {
                            URL.revokeObjectURL(image.url);
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
                    uploadImage(file);
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
                className="omnibox-comment-submit"
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
          <ResourceCommentBody
            content={comment.content}
            attachments={comment.attachments}
          />
        )}
      </div>
    </div>
  );
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
  const [unit, seconds] = units.find(
    ([, unitSeconds]) => Math.abs(elapsedSeconds) >= unitSeconds
  ) ?? ['minute', 60];
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(
    Math.round(elapsedSeconds / seconds),
    unit
  );
}
