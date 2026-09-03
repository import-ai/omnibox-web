import {
  QQ_ASSISTANT_QRCODE_CONTENT,
  WECHAT_ASSISTANT_QRCODE_CONTENT,
} from '@/const';

export const TELEGRAM_ASSISTANT_URL = 'https://t.me/omnibox_tg_bot';

function isValidHttpsUrl(url?: string): url is string {
  if (!url) return false;

  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

export function getQrCodeUrl(
  appId: string,
  bindingCode?: string,
  urlLink?: string
): string {
  switch (appId) {
    case 'wechat_bot':
      return WECHAT_ASSISTANT_QRCODE_CONTENT;
    case 'qq_bot':
      return isValidHttpsUrl(urlLink) ? urlLink : QQ_ASSISTANT_QRCODE_CONTENT;
    case 'telegram_bot':
      return bindingCode
        ? `${TELEGRAM_ASSISTANT_URL}?start=${encodeURIComponent(bindingCode)}`
        : TELEGRAM_ASSISTANT_URL;
    default:
      return '';
  }
}
