import { QQ_ASSISTANT_URL, WECHAT_ASSISTANT_QRCODE_URL } from '@/const';

export function getQrCodeUrl(appId: string): string {
  switch (appId) {
    case 'wechat_bot':
      return WECHAT_ASSISTANT_QRCODE_URL;
    case 'qq_bot':
      return QQ_ASSISTANT_URL;
    default:
      return '';
  }
}
