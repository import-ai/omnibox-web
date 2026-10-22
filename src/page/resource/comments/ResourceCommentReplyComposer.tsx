import { Image, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { useAutosizeTextArea } from '@/components/autosize-textarea';
import { Button } from '@/components/Button';
import { Textarea } from '@/components/ui/textarea';
import type { ResourceCommentAttachment } from '@/interface';

import { CommentMentionMenu } from './CommentMentionMenu';
import { pasteCommentImage } from './pasteCommentImage';
import { ResourceCommentAvatar } from './ResourceCommentAvatar';
import { ResourceCommentDraftImage } from './ResourceCommentDraftImage';
import { useCommentMentionInput } from './useCommentMentionInput';

export function ResourceCommentReplyComposer({
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
  const mention = useCommentMentionInput(reply, onChange);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [attachmentId, setAttachmentId] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const uploadRequestRef = useRef(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useAutosizeTextArea({
    textAreaRef: inputRef,
    triggerAutoSize: `${reply}:${!!imagePreview}`,
  });
  const hasDraft = !!(reply.trim() || attachmentId);
  const uploading = !!imagePreview && !attachmentId;

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    return () => {
      uploadRequestRef.current += 1;
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const clearImage = () => {
    uploadRequestRef.current += 1;
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setImagePreview(null);
    setAttachmentId(null);
  };

  const uploadImage = (file: File) => {
    if (submitting || !file.type.startsWith('image/')) {
      return;
    }
    clearImage();
    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setImagePreview(url);
    const requestId = uploadRequestRef.current;
    onUploadImage(file)
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

  const submitDraft = () => {
    if (submitting || uploading || !hasDraft) {
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
      <ResourceCommentAvatar author={author} />
      <div
        className="omnibox-comment-reply__input"
        data-has-preview={imagePreview ? '' : undefined}
      >
        <Textarea
          ref={inputRef}
          className="border-line"
          maxLength={10000}
          placeholder={t('resource_comments.reply_placeholder')}
          rows={1}
          value={mention.displayValue}
          {...mention.inputProps}
          onPaste={event => pasteCommentImage(event, uploadImage)}
          aria-busy={uploading}
          onKeyDown={event => {
            if (mention.onKeyDown(event)) {
              return;
            }
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
        <CommentMentionMenu spec={mention.menu} />
        {imagePreview ? (
          <div className="omnibox-comment-reply__preview">
            <ResourceCommentDraftImage key={imagePreview} src={imagePreview} />
            <button
              type="button"
              className="omnibox-comment-image-remove"
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
              uploadImage(file);
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
          className="omnibox-comment-submit"
          disabled={submitting || uploading || !hasDraft}
          onClick={submitDraft}
        >
          {t('resource_comments.reply')}
        </Button>
      </div>
    </div>
  );
}
