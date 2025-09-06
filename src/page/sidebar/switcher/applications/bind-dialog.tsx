import QRCode from 'qrcode';
import { useCallback, useEffect, useRef, useState } from 'react';
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

interface BindDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bindingCode: string;
  applicationId: string;
  checkApplicationStatus: (applicationId: string) => Promise<any>;
  onBindingComplete: () => void;
}

export function BindDialog({
  open,
  onOpenChange,
  bindingCode,
  applicationId,
  checkApplicationStatus,
  onBindingComplete,
}: BindDialogProps) {
  const { t } = useTranslation();
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingStartTimeRef = useRef<number>(0);

  const POLLING_INTERVAL = 3000; // 3 seconds
  const POLLING_TIMEOUT = 5 * 60 * 1000; // 5 minutes

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
        POLLING_INTERVAL
      );
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [open, applicationId, checkBindingStatus, stopPolling, POLLING_INTERVAL]);

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
