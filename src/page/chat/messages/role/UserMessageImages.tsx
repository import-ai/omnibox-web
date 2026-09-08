import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/Dialog';

import type { UserMessageImagePart } from './userMessageTokens';

export function UserMessageImages({
  images,
}: {
  images: UserMessageImagePart[];
}) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<UserMessageImagePart | null>(null);

  if (images.length === 0) return null;

  return (
    <>
      <div className="mb-2 flex flex-wrap justify-end gap-2">
        {images.map(image => (
          <button
            key={image.attachment_id}
            type="button"
            aria-label={t('chat.image.preview')}
            className="relative"
            onClick={() => setPreview(image)}
          >
            <img
              src={image.preview_url}
              alt={image.name}
              className="size-16 rounded-md object-cover"
            />
          </button>
        ))}
      </div>
      <Dialog
        open={preview !== null}
        onOpenChange={open => {
          if (!open) setPreview(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-[min(90vw,960px)] border-0 bg-transparent p-0 shadow-none">
          <DialogTitle className="sr-only">
            {preview?.name || t('chat.image.preview')}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t('chat.image.preview')}
          </DialogDescription>
          {preview ? (
            <img
              src={preview.preview_url}
              alt={preview.name}
              className="max-h-[85vh] w-full rounded-md object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
