import { X } from 'lucide-react';
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
  const title = alt || t('chat.image.preview');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="fixed left-0 top-0 flex h-full w-full max-w-none translate-x-0 translate-y-0 items-center justify-center gap-0 border-0 bg-transparent p-0 shadow-none data-[state=closed]:slide-out-to-left-0 data-[state=closed]:slide-out-to-top-0 data-[state=open]:slide-in-from-left-0 data-[state=open]:slide-in-from-top-0 [&>button:last-child]:hidden"
        onOpenAutoFocus={event => event.preventDefault()}
        onClick={event => {
          if (event.target === event.currentTarget) onOpenChange(false);
        }}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">
          {t('chat.image.preview')}
        </DialogDescription>
        {src ? (
          <div className="relative max-h-[90vh] max-w-[min(90vw,960px)]">
            <img
              src={src}
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
