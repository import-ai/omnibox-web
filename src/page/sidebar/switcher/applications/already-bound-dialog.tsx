import { useTranslation } from 'react-i18next';

import logoUrl from '@/assets/logo.svg';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { getQrCodeUrl } from './get-qr-code-url';
import { useQrCode } from './use-qr-code';

interface AlreadyBoundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appId: string;
}

export function AlreadyBoundDialog({
  open,
  onOpenChange,
  appId,
}: AlreadyBoundDialogProps) {
  const { t } = useTranslation();

  const qrCodeUrl = getQrCodeUrl(appId);
  const platformName = t(`applications.app_names.${appId}`, {
    defaultValue: appId,
  });
  const qrCodeDataUrl = useQrCode(qrCodeUrl, open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('applications.already_bound.title')}</DialogTitle>
          <DialogDescription>
            {t('applications.already_bound.description', {
              platform_name: platformName,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4 py-4">
          {qrCodeDataUrl ? (
            <div className="relative">
              <img
                src={qrCodeDataUrl}
                alt="Bot QR Code"
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
