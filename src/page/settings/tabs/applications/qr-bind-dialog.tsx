import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import logoUrl from '@/assets/logo.svg';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BIND_CHECK_INTERVAL } from '@/const';

import { useQrCode } from './use-qr-code';

interface QRCodeBindDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qrcodeContent: string;
  applicationId: string;
  appId: string;
  checkApplicationStatus: (applicationId: string) => Promise<any>;
  onBindingComplete: () => void;
}

export function QRCodeBindDialog({
  open,
  onOpenChange,
  qrcodeContent,
  applicationId,
  appId,
  checkApplicationStatus,
  onBindingComplete,
}: QRCodeBindDialogProps) {
  const { t } = useTranslation();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingStartTimeRef = useRef<number>(0);

  const POLLING_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  const platformName = t(`applications.scan_via.${appId}`, {
    defaultValue: appId,
  });
  const qrCodeDataUrl = useQrCode(qrcodeContent, open);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const checkBindingStatus = useCallback(async () => {
    if (!open || !applicationId) return;

    try {
      const application = await checkApplicationStatus(applicationId);

      // Check if binding is complete (has api_key_id)
      if (application.api_key_id) {
        stopPolling();
        onBindingComplete();
        return;
      }

      // Check for timeout
      const elapsedTime = Date.now() - pollingStartTimeRef.current;
      if (elapsedTime > POLLING_TIMEOUT) {
        stopPolling();
        console.warn('Binding check timeout reached');
      }
    } catch (error) {
      console.error('Error checking binding status:', error);
      // Continue polling despite errors
    }
  }, [
    open,
    applicationId,
    checkApplicationStatus,
    onBindingComplete,
    stopPolling,
    POLLING_TIMEOUT,
  ]);

  // Start polling when dialog opens
  useEffect(() => {
    if (open && applicationId) {
      pollingStartTimeRef.current = Date.now();
      pollingIntervalRef.current = setInterval(
        checkBindingStatus,
        BIND_CHECK_INTERVAL
      );
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [open, applicationId, checkBindingStatus, stopPolling]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('applications.bind.title')}</DialogTitle>
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
                  className="size-12 rounded-lg bg-white p-1 shadow-sm"
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
