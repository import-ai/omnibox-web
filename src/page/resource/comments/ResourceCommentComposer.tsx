import { Image, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { AutosizeTextarea } from '@/components/autosize-textarea';
import { Button } from '@/components/ui/Button';

import { pasteCommentImage } from './pasteCommentImage';
import { useCommentDraftPosition } from './useCommentDraftPosition';
import type { ResourceCommentsController } from './useResourceComments';

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
  const surfaceRef = useRef<HTMLElement>(null);
  const panelTop = useCommentDraftPosition({
    selection,
    surfaceRef,
  });
  const previewUrlRef = useRef<string | null>(null);
  const uploadRequestRef = useRef(0);
  const selectionKey = selection ? `${selection.from}:${selection.to}` : null;
  const uploading = !!imagePreview && !attachmentId;
  const hasDraft = !!content.trim() || !!attachmentId;

  const clearImage = useCallback(() => {
    uploadRequestRef.current += 1;
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
      uploadRequestRef.current += 1;
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (selection) {
      surfaceRef.current
        ?.querySelector('textarea')
        ?.focus({ preventScroll: true });
    }
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

  const uploadImage = (file: File) => {
    if (controller.submitting || !file.type.startsWith('image/')) {
      return;
    }
    clearImage();
    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setImagePreview(url);
    const requestId = ++uploadRequestRef.current;
    controller
      .uploadCommentImage(file)
      .then(uploaded => {
        if (requestId === uploadRequestRef.current) {
          setAttachmentId(uploaded.id);
        }
      })
      .catch(() => {
        if (requestId === uploadRequestRef.current) {
          clearImage();
          toast.error(t('upload.failed'));
        }
      });
  };

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
      data-mode="draft"
      role="dialog"
      style={{
        top: panelTop ?? 0,
        visibility: panelTop === null ? 'hidden' : undefined,
      }}
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
            className="border-line"
            minHeight={0}
            maxHeight={160}
            maxLength={10000}
            placeholder={t('resource_comments.write_comment')}
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
                uploadImage(file);
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
