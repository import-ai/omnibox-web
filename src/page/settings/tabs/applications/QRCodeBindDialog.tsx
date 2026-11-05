import { useTranslation } from 'react-i18next';

import logoUrl from '@/assets/logo.svg';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/omnibox/Dialog';
import type { Application } from '@/interface';

import { useBindingStatusPolling } from './useBindingStatusPolling';
import { useQrCode } from './useQrCode';

interface QRCodeBindDialogProps {
  open: boolean;
  active?: boolean;
  onOpenChange: (open: boolean) => void;
  qrcodeContent: string;
  applicationId: string;
  appId: string;
  checkApplicationStatus: (
    applicationId: string,
    options?: { signal?: AbortSignal }
  ) => Promise<Application>;
  onBindingComplete: () => void;
}

export function QRCodeBindDialog({
  open,
  active = true,
  onOpenChange,
  qrcodeContent,
  applicationId,
  appId,
  checkApplicationStatus,
  onBindingComplete,
}: QRCodeBindDialogProps) {
  const { t } = useTranslation();
  const platformName = t(`applications.scan_via.${appId}`, {
    defaultValue: appId,
  });
  const appName = t(`applications.app_names.${appId}`, {
    defaultValue: appId,
  });
  const qrCodeDataUrl = useQrCode(qrcodeContent, open);

  useBindingStatusPolling({
    open,
    active,
    applicationId,
    checkApplicationStatus,
    onBindingComplete,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90%] max-h-[90svh] overflow-y-auto rounded-md max-w-md sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('applications.qr_bind.title', { app_name: appName })}
          </DialogTitle>
          <DialogDescription>
            {t('applications.qr_bind.description', {
              platform_name: platformName,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6 py-4">
          <h3 className="text-lg font-medium">
            {t('applications.qr_bind.step1', { platform_name: platformName })}
          </h3>
          {qrCodeDataUrl ? (
            <div className="relative">
              <img
                src={qrCodeDataUrl}
                alt="Binding QR Code"
                className="size-48 rounded-lg border border-border"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <img
                  src={logoUrl}
                  alt="OmniBox Logo"
                  className="size-12 rounded-lg bg-white p-1 shadow-xs"
                />
              </div>
            </div>
          ) : (
            <div className="flex size-48 items-center justify-center rounded-lg border border-border">
              <div className="text-center text-muted-foreground">
                {t('loading')}
              </div>
            </div>
          )}
          <p className="px-4 text-center text-sm text-muted-foreground">
            {t('applications.qr_bind.instruction', {
              platform_name: platformName,
            })}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
