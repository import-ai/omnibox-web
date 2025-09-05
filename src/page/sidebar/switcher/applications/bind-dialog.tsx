import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { WECHAT_BOT_QRCODE_URL } from '@/const';

interface BindDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bindingCode: string;
}

export function BindDialog({
  open,
  onOpenChange,
  bindingCode,
}: BindDialogProps) {
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('applications.bind.title')}</DialogTitle>
          <DialogDescription>
            {t('applications.bind.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* QR Code Section */}
          <div className="flex flex-col items-center space-y-4">
            <h3 className="text-lg font-medium">
              {t('applications.bind.step1')}
            </h3>
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="WeChat Bot QR Code"
                className="w-48 h-48 border border-border rounded-lg"
              />
            ) : (
              <div className="w-48 h-48 border border-border rounded-lg flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  {t('loading')}
                </div>
              </div>
            )}
          </div>

          {/* Code Section */}
          <div className="flex flex-col space-y-4">
            <h3 className="text-lg font-medium">
              {t('applications.bind.step2')}
            </h3>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                {t('applications.bind.code_label')}
              </p>
              <div className="font-mono text-lg font-semibold p-2 bg-background border rounded">
                {bindingCode}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('applications.bind.code_instruction')}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
