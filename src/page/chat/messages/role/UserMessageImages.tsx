import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ImagePreviewDialog } from '@/components/ImagePreviewDialog';

import type { UserMessageImagePart } from './userMessageTokens';

export function UserMessageImages({
  images,
}: {
  images: UserMessageImagePart[];
}) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<UserMessageImagePart | null>(null);
  const invokerRef = useRef<HTMLButtonElement | null>(null);

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
            onClick={event => {
              invokerRef.current = event.currentTarget;
              setPreview(image);
            }}
          >
            <img
              src={image.preview_url}
              alt={image.name}
              className="size-16 rounded-md object-cover"
            />
          </button>
        ))}
      </div>
      <ImagePreviewDialog
        alt={preview?.name}
        open={preview !== null}
        src={preview?.preview_url}
        invokerRef={invokerRef}
        onOpenChange={open => {
          if (!open) setPreview(null);
        }}
      />
    </>
  );
}
