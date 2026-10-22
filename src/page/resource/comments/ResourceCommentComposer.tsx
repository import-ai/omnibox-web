import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { type AutosizeTextAreaRef } from '@/components/autosize-textarea';
import { Button } from '@/components/ui/Button';

import { imageCommentLabel } from './commentQuote';
import { ResourceCommentInput } from './ResourceCommentInput';
import { useCommentDraft } from './useCommentDraft';
import { useCommentDraftPosition } from './useCommentDraftPosition';
import type { ResourceCommentsController } from './useResourceComments';

interface ResourceCommentComposerProps {
  controller: ResourceCommentsController;
}

const COMMENT_DRAFT_DISMISS_MS = 180;

export function ResourceCommentComposer({
  controller,
}: ResourceCommentComposerProps) {
  const { t } = useTranslation();
  const selection = controller.canComment ? controller.pendingSelection : null;
  const [isClosing, setIsClosing] = useState(false);
  const surfaceRef = useRef<HTMLElement>(null);
  const inputRef = useRef<AutosizeTextAreaRef>(null);
  const panelTop = useCommentDraftPosition({
    selection,
    surfaceRef,
  });
  const closeTimerRef = useRef<number | null>(null);
  const previousSelectionRef = useRef(selection);
  const selectionKey = selection ? `${selection.from}:${selection.to}` : null;
  const {
    content,
    setContent,
    imagePreview,
    attachmentId,
    uploading,
    hasDraft,
    clearImage,
    uploadImage,
  } = useCommentDraft(
    selectionKey,
    controller.uploadCommentImage,
    controller.submitting
  );

  useEffect(() => {
    if (selection && selection !== previousSelectionRef.current) {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setIsClosing(false);
    }
    previousSelectionRef.current = selection;
  }, [selection]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (selection && panelTop !== null) {
      inputRef.current?.textArea.focus({ preventScroll: true });
    }
  }, [panelTop, selection]);

  const cancel = useCallback(() => {
    if (controller.submitting || isClosing) {
      return;
    }
    setIsClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      controller.setPendingSelection(null);
      controller.setCreateConflict(false);
      setIsClosing(false);
    }, COMMENT_DRAFT_DISMISS_MS);
  }, [controller, isClosing]);

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

  useEffect(() => {
    if (!selection || hasDraft || uploading) {
      return;
    }
    const handleOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || surfaceRef.current?.contains(target)) {
        return;
      }
      cancel();
    };
    document.addEventListener('pointerdown', handleOutsidePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointerDown);
    };
  }, [cancel, hasDraft, selection, uploading]);

  if (!selection) {
    return null;
  }

  const submit = async () => {
    if (!hasDraft || uploading || controller.submitting) {
      return;
    }
    await controller.createThread(
      content.trim(),
      attachmentId ? [attachmentId] : undefined
    );
  };

  return (
    <aside
      ref={surfaceRef}
      className="omnibox-comment-surface resource-comments-draft-surface"
      aria-label={t('resource_comments.write_comment')}
      data-closing={isClosing ? '' : undefined}
      data-mode="draft"
      role="dialog"
      style={{
        top: panelTop ?? 0,
        visibility: panelTop === null ? 'hidden' : undefined,
      }}
    >
      <form
        className="omnibox-comment-composer"
        data-has-draft={hasDraft ? '' : undefined}
        onSubmit={event => {
          event.preventDefault();
          submit().catch(() => undefined);
        }}
      >
        <q>
          {imageCommentLabel(
            null,
            selection.quotedText,
            t('resource_comments.image_quote')
          )}
        </q>
        <ResourceCommentInput
          draft={{
            content,
            setContent,
            imagePreview,
            uploading,
            clearImage,
            uploadImage,
          }}
          inputRef={inputRef}
          disabled={controller.submitting}
          onSubmit={submit}
        />
        {controller.createConflict ? (
          <p className="omnibox-comment-composer__error" role="alert">
            {t('resource_comments.content_conflict')}
          </p>
        ) : null}
        <div className="omnibox-comment-composer__actions">
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
            disabled={controller.submitting || uploading || !hasDraft}
          >
            {t('resource_comments.comment')}
          </Button>
        </div>
      </form>
    </aside>
  );
}
