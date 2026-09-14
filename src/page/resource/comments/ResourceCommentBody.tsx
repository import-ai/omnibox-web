import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog';
import type { ResourceCommentAttachment } from '@/interface';

export function ResourceCommentBody({
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
