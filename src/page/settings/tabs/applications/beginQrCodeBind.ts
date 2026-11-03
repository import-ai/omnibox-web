import type { Application, ApplicationAttrs } from '@/interface';

export const WECHAT_OA_APP_ID = 'wechat_oa_bot';

// A QR code this close to expiring is replaced rather than shown, so it does
// not run out while the user is still scanning it.
const QR_CODE_RENEW_MARGIN_MS = 10 * 60 * 1000;

export function isQrCodeExpired(
  attrs: ApplicationAttrs | undefined,
  now: number = Date.now()
): boolean {
  const expiresAt = Date.parse(attrs?.qrcode_expires_at ?? '');
  return Number.isNaN(expiresAt) || expiresAt - now < QR_CODE_RENEW_MARGIN_MS;
}

export type QrCodeBindResult =
  | { status: 'already_bound' }
  | {
      status: 'ready';
      qrcodeContent: string;
      application: Application;
      resumed: boolean;
    };

/**
 * Starts (or resumes) a binding whose QR code the server generates per
 * binding and lets expire, such as the WeChat official account. A pending
 * binding whose QR code has expired is cancelled and started again.
 */
export async function beginQrCodeBind(
  application: Application,
  bindApplication: (appId: string) => Promise<Application>,
  unbindApplication: (
    applicationId: string,
    options?: { showLoading?: boolean }
  ) => Promise<void>,
  now: number = Date.now()
): Promise<QrCodeBindResult> {
  if (application.api_key_id) {
    return { status: 'already_bound' };
  }
  const qrcodeContent = application.attrs?.qrcode_content;
  if (
    application.id &&
    qrcodeContent &&
    !isQrCodeExpired(application.attrs, now)
  ) {
    return { status: 'ready', qrcodeContent, application, resumed: true };
  }
  if (application.id) {
    await unbindApplication(application.id, { showLoading: false });
  }
  const response = await bindApplication(application.app_id);
  return {
    status: 'ready',
    qrcodeContent: response.attrs?.qrcode_content ?? '',
    application: response,
    resumed: false,
  };
}
