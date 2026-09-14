import { X } from 'lucide-react';
import { type CSSProperties, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/Dialog';

export function ImagePreviewDialog({
  alt,
  open,
  src,
  onOpenChange,
}: {
  alt?: string;
  open: boolean;
  src?: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const [retained, setRetained] = useState({ src, alt });
  useLayoutEffect(() => {
    if (open) setRetained({ src, alt });
  }, [open, src, alt]);
  const imageSrc = open ? src : retained.src;
  const title = (open ? alt : retained.alt) || t('chat.image.preview');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="fixed left-0 top-0 flex h-full w-full max-w-none translate-x-0 translate-y-0 items-center justify-center gap-0 border-0 bg-transparent p-0 shadow-none motion-reduce:animate-none [&>button:last-child]:hidden"
        style={
          {
            '--tw-enter-scale': '1',
            '--tw-exit-scale': '1',
            '--tw-enter-translate-x': '0px',
            '--tw-enter-translate-y': '0px',
            '--tw-exit-translate-x': '0px',
            '--tw-exit-translate-y': '0px',
          } as CSSProperties
        }
        onOpenAutoFocus={event => event.preventDefault()}
        onClick={event => {
          if (event.target === event.currentTarget) onOpenChange(false);
        }}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">
          {t('chat.image.preview')}
        </DialogDescription>
        {imageSrc ? (
          <div className="relative max-h-[90vh] max-w-[min(90vw,960px)]">
            <img
              src={imageSrc}
              alt={title}
              className="max-h-[85vh] w-full rounded-md object-contain"
            />
            <DialogClose asChild>
              <button
                type="button"
                aria-label={t('close')}
                className="absolute right-3 top-3 z-10 inline-flex size-8 items-center justify-center rounded-full bg-black/55 text-white shadow-sm transition-colors hover:bg-black/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/40"
              >
                <X className="size-4" />
              </button>
            </DialogClose>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
