import {
  QQ_ASSISTANT_QRCODE_CONTENT,
  WECHAT_ASSISTANT_QRCODE_CONTENT,
} from '@/const';

export const TELEGRAM_ASSISTANT_URL = 'https://t.me/omnibox_tg_bot';

export function getQrCodeUrl(appId: string, bindingCode?: string): string {
  switch (appId) {
    case 'wechat_bot':
      return WECHAT_ASSISTANT_QRCODE_CONTENT;
    case 'qq_bot':
      return QQ_ASSISTANT_QRCODE_CONTENT;
    case 'telegram_bot':
      return bindingCode
        ? `${TELEGRAM_ASSISTANT_URL}?start=${encodeURIComponent(bindingCode)}`
        : TELEGRAM_ASSISTANT_URL;
    default:
      return '';
  }
}
