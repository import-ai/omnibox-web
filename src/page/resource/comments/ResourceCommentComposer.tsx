import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';

import type { ResourceCommentsController } from './useResourceComments';

const SURFACE_WIDTH = 360;
const SURFACE_HEIGHT_ESTIMATE = 180;
const SURFACE_MARGIN = 12;
const SURFACE_MIN_TOP = 56;

interface ResourceCommentComposerProps {
  controller: ResourceCommentsController;
}

export function ResourceCommentComposer({
  controller,
}: ResourceCommentComposerProps) {
  const { t } = useTranslation();
  const selection = controller.pendingSelection;
  const [content, setContent] = useState('');
  const [position, setPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const selectionKey = selection ? `${selection.from}:${selection.to}` : null;

  useEffect(() => {
    setContent('');
  }, [selectionKey]);

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
    const value = content.trim();
    if (!value || controller.submitting) {
      return;
    }
    await controller.createThread(value);
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
          <Textarea
            autoFocus
            className="border-line"
            maxLength={10000}
            placeholder={t('resource_comments.write_comment')}
            rows={2}
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
              disabled={controller.submitting || !content.trim()}
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
