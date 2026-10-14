import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ImagePreviewDialog } from '@/components/ImagePreviewDialog';

export function ResourceCommentDraftImage({ src }: { src: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const invokerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={invokerRef}
        type="button"
        className="omnibox-comment-draft-image"
        aria-label={t('chat.image.preview')}
        onClick={event => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <img src={src} alt="" />
      </button>
      <ImagePreviewDialog
        src={src}
        open={open}
        invokerRef={invokerRef}
        onOpenChange={setOpen}
      />
    </>
  );
}
