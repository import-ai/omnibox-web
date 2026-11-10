import { Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import logoUrl from '@/assets/logo.svg';
import { Button } from '@/components/Button';
import CopyMain from '@/components/copy';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/omnibox/Dialog';
import type { Application } from '@/interface';

import { getQrCodeUrl } from './getQrCodeUrl';
import { useBindingStatusPolling } from './useBindingStatusPolling';
import { useQrCode } from './useQrCode';

interface BindDialogProps {
  open: boolean;
  active?: boolean;
  onOpenChange: (open: boolean) => void;
  bindingCode: string;
  urlLink?: string;
  applicationId: string;
  appId: string;
  checkApplicationStatus: (
    applicationId: string,
    options?: { signal?: AbortSignal }
  ) => Promise<Application>;
  onBindingComplete: () => void;
}

export function BindDialog({
  open,
  active = true,
  onOpenChange,
  bindingCode,
  urlLink,
  applicationId,
  appId,
  checkApplicationStatus,
  onBindingComplete,
}: BindDialogProps) {
  const { t } = useTranslation();
  const qrCodeUrl = getQrCodeUrl(appId, bindingCode, urlLink);
  const isTelegram = appId === 'telegram_bot';
  const platformName = t(`applications.app_names.${appId}`, {
    defaultValue: appId,
  });
  const qrCodeDataUrl = useQrCode(qrCodeUrl, open);

  useBindingStatusPolling({
    open,
    active,
    applicationId,
    checkApplicationStatus,
    onBindingComplete,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90%] max-h-[90svh] overflow-y-auto rounded-md max-w-2xl sm:max-w-2xl">
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
            {isTelegram && (
              <Button
                trackName="settings_binding_open"
                asChild
                className="w-full max-w-48"
              >
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
                  trackName="settings_binding_copy"
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
