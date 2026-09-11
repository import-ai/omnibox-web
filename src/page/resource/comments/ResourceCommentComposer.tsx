import { Image, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { AutosizeTextarea } from '@/components/autosize-textarea';
import { Button } from '@/components/ui/Button';

import type { ResourceCommentsController } from './useResourceComments';

const SURFACE_WIDTH = 360;
const SURFACE_HEIGHT_ESTIMATE = 220;
const SURFACE_MARGIN = 12;
const SURFACE_MIN_TOP = 56;

interface ResourceCommentComposerProps {
  controller: ResourceCommentsController;
}

export function ResourceCommentComposer({
  controller,
}: ResourceCommentComposerProps) {
  const { t } = useTranslation();
  const selection = controller.canComment ? controller.pendingSelection : null;
  const [content, setContent] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [attachmentId, setAttachmentId] = useState<string | null>(null);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const selectionKey = selection ? `${selection.from}:${selection.to}` : null;
  const hasDraft = !!content.trim() || !!attachmentId;

  const clearImage = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setImagePreview(null);
    setAttachmentId(null);
  }, []);

  useEffect(() => {
    setContent('');
    clearImage();
  }, [clearImage, selectionKey]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!selection) {
      setPosition(null);
      return;
    }
    let frame = 0;
    const updatePosition = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const surfaceWidth = Math.min(
          SURFACE_WIDTH,
          window.innerWidth - SURFACE_MARGIN * 2
        );
        try {
          const start = selection.editor.view.coordsAtPos(selection.from);
          const end = selection.editor.view.coordsAtPos(selection.to);
          const anchorCenter = (start.left + end.right) / 2;
          const left = Math.min(
            Math.max(SURFACE_MARGIN, anchorCenter - surfaceWidth / 2),
            window.innerWidth - surfaceWidth - SURFACE_MARGIN
          );
          const spaceBelow = window.innerHeight - end.bottom - SURFACE_MARGIN;
          const preferredTop =
            spaceBelow >= SURFACE_HEIGHT_ESTIMATE
              ? end.bottom + 10
              : start.top - SURFACE_HEIGHT_ESTIMATE - 10;
          setPosition({
            left,
            top: Math.max(SURFACE_MIN_TOP, preferredTop),
          });
        } catch {
          setPosition({
            left: Math.max(
              SURFACE_MARGIN,
              (window.innerWidth - surfaceWidth) / 2
            ),
            top: Math.max(
              SURFACE_MIN_TOP,
              (window.innerHeight - SURFACE_HEIGHT_ESTIMATE) / 2
            ),
          });
        }
      });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [selection]);

  const cancel = useCallback(() => {
    if (controller.submitting) {
      return;
    }
    controller.setPendingSelection(null);
    controller.setCreateConflict(false);
  }, [controller]);

  useEffect(() => {
    if (!selection) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        cancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancel, selection]);

  if (!selection || !position || typeof document === 'undefined') {
    return null;
  }

  const submit = async () => {
    if (!hasDraft || controller.submitting) {
      return;
    }
    await controller.createThread(
      content.trim(),
      attachmentId ? [attachmentId] : undefined
    );
  };

  return createPortal(
    <>
      <div
        className="omnibox-comment-composer-backdrop"
        aria-hidden="true"
        onMouseDown={cancel}
      />
      <aside
        className="omnibox-comment-surface"
        aria-label={t('resource_comments.write_comment')}
        data-mode="draft"
        role="dialog"
        style={position}
      >
        <form
          className="omnibox-comment-composer"
          onSubmit={event => {
            event.preventDefault();
            submit().catch(() => undefined);
          }}
        >
          <q>{selection.quotedText}</q>
          <div
            className="omnibox-comment-composer__input"
            data-has-preview={imagePreview ? '' : undefined}
          >
            <AutosizeTextarea
              autoFocus
              className="border-line"
              minHeight={0}
              maxHeight={160}
              maxLength={10000}
              placeholder={t('resource_comments.write_comment')}
              rows={1}
              value={content}
              onChange={event => setContent(event.target.value)}
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
                submit().catch(() => undefined);
              }}
            />
            {imagePreview ? (
              <div className="omnibox-comment-composer__preview">
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
              className="omnibox-comment-composer__attach"
              aria-label={t('resource_comments.attach_image')}
              title={t('resource_comments.attach_image')}
            >
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
                  clearImage();
                  const url = URL.createObjectURL(file);
                  previewUrlRef.current = url;
                  setImagePreview(url);
                  controller
                    .uploadCommentImage(file)
                    .then(uploaded => {
                      setAttachmentId(uploaded.id);
                    })
                    .catch(clearImage);
                }}
              />
              <Image aria-hidden="true" className="size-4" strokeWidth={1.5} />
            </label>
          </div>
          {controller.createConflict ? (
            <p className="omnibox-comment-composer__error" role="alert">
              {t('resource_comments.content_conflict')}
            </p>
          ) : null}
          <div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={controller.submitting}
              onClick={cancel}
            >
              {t('resource_comments.cancel')}
            </Button>
            <Button
              type="submit"
              size="sm"
              className="omnibox-comment-submit"
              disabled={controller.submitting || !hasDraft}
            >
              {t('resource_comments.comment')}
            </Button>
          </div>
        </form>
      </aside>
    </>,
    document.body
  );
}
