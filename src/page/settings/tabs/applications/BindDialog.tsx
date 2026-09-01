import { Send } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import logoUrl from '@/assets/logo.svg';
import { Button } from '@/components/button';
import CopyMain from '@/components/copy';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { BIND_CHECK_INTERVAL } from '@/const';

import { getQrCodeUrl } from './getQrCodeUrl';
import { useQrCode } from './useQrCode';

interface BindDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bindingCode: string;
  urlLink?: string;
  applicationId: string;
  appId: string;
  checkApplicationStatus: (applicationId: string) => Promise<any>;
  onBindingComplete: () => void;
}

export function BindDialog({
  open,
  onOpenChange,
  bindingCode,
  urlLink,
  applicationId,
  appId,
  checkApplicationStatus,
  onBindingComplete,
}: BindDialogProps) {
  const { t } = useTranslation();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingStartTimeRef = useRef<number>(0);

  const POLLING_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  const qrCodeUrl = getQrCodeUrl(appId, bindingCode, urlLink);
  const isTelegram = appId === 'telegram_bot';
  const platformName = t(`applications.app_names.${appId}`, {
    defaultValue: appId,
  });
  const qrCodeDataUrl = useQrCode(qrCodeUrl, open);

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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('applications.bind.title')}</DialogTitle>
          <DialogDescription>
            {t('applications.bind.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 py-4 md:grid-cols-2">
          {/* QR Code Section */}
          <div className="flex flex-col items-center space-y-4">
            <h3 className="text-lg font-medium">
              {t(
                isTelegram
                  ? 'applications.bind.telegram_step1'
                  : 'applications.bind.step1',
                { platform_name: platformName }
              )}
            </h3>
            {qrCodeDataUrl ? (
              <div className="relative">
                <img
                  src={qrCodeDataUrl}
                  alt="Bot QR Code"
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
            {isTelegram && (
              <Button asChild className="w-full max-w-48">
                <a href={qrCodeUrl} target="_blank" rel="noreferrer">
                  <Send className="size-4" />
                  {t('applications.bind.open_telegram')}
                </a>
              </Button>
            )}
          </div>

          {/* Code Section */}
          <div className="flex flex-col space-y-4">
            <h3 className="text-lg font-medium">
              {t(
                isTelegram
                  ? 'applications.bind.telegram_step2'
                  : 'applications.bind.step2',
                { platform_name: platformName }
              )}
            </h3>
            <div className="p-4">
              <p className="mb-2 text-sm text-muted-foreground">
                {t('applications.bind.code_label')}
              </p>
              <div className="flex items-center justify-between gap-2 rounded border bg-background p-2 font-mono text-lg font-semibold">
                <span>{bindingCode}</span>
                <CopyMain
                  content={bindingCode}
                  tooltip={t('applications.bind.copy_code')}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {t(
                isTelegram
                  ? 'applications.bind.telegram_code_instruction'
                  : 'applications.bind.code_instruction',
                {
                  code: bindingCode,
                  platform_name: platformName,
                }
              )}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
