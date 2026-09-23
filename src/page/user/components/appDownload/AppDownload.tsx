import './appDownload.css';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Dialog,
  DialogClose,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';
import { cn } from '@/lib/utils';

import { getAppDownloadUrl, isMobileDownloadClient } from './downloadQr';
import { DownloadQrCode } from './DownloadQrCode';

/** Desktop-only app download entry; never mounts a dialog on mobile browsers. */
export default function AppDownload() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  if (typeof navigator === 'undefined' || isMobileDownloadClient(navigator))
    return null;
  const url = getAppDownloadUrl(i18n.language);
  const title = t('app_download_qr.title');
  return (
    <div className="app-download-entry">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="app-download-card app-download-trigger"
          >
            <span className="app-download-caption">{title}</span>
            <DownloadQrCode url={url} />
          </button>
        </DialogTrigger>
        <DialogPortal>
          <DialogOverlay className="app-download-overlay" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className={cn(
              'fixed inset-0 z-50 flex flex-col items-center justify-center outline-none',
              'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:animate-none'
            )}
            onClick={event => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <DialogClose asChild>
              <button
                type="button"
                aria-label={t('close')}
                className="app-download-close"
              >
                <X className="size-5" strokeWidth={1.75} />
              </button>
            </DialogClose>
            <div className="app-download-card app-download-dialog-panel">
              <DownloadQrCode url={url} variant="expanded" />
            </div>
            <DialogTitle className="app-download-dialog-title">
              {t('app_download_qr.hint')}
            </DialogTitle>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </div>
  );
}
