import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import logoUrl from '@/assets/logo.svg';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { WECHAT_BOT_QRCODE_URL } from '@/const';

interface AlreadyBoundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AlreadyBoundDialog({
  open,
  onOpenChange,
}: AlreadyBoundDialogProps) {
  const { t } = useTranslation();
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  useEffect(() => {
    if (open && WECHAT_BOT_QRCODE_URL) {
      QRCode.toDataURL(WECHAT_BOT_QRCODE_URL, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
        .then(url => {
          setQrCodeDataUrl(url);
        })
        .catch(err => {
          console.error('Error generating QR code:', err);
        });
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('applications.already_bound.title')}</DialogTitle>
          <DialogDescription>
            {t('applications.already_bound.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4 py-4">
          {qrCodeDataUrl ? (
            <div className="relative">
              <img
                src={qrCodeDataUrl}
                alt="WeChat Bot QR Code"
                className="w-48 h-48 border border-border rounded-lg"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <img
                  src={logoUrl}
                  alt="OmniBox Logo"
                  className="w-12 h-12 bg-white p-1 rounded-lg shadow-sm"
                />
              </div>
            </div>
          ) : (
            <div className="w-48 h-48 border border-border rounded-lg flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                {t('loading')}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
