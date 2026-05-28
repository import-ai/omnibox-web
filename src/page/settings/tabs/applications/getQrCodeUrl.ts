import {
  QQ_ASSISTANT_QRCODE_CONTENT,
  WECHAT_ASSISTANT_QRCODE_CONTENT,
} from '@/const';

export function getQrCodeUrl(appId: string): string {
  switch (appId) {
    case 'wechat_bot':
      return WECHAT_ASSISTANT_QRCODE_CONTENT;
    case 'qq_bot':
      return QQ_ASSISTANT_QRCODE_CONTENT;
    default:
      return '';
  }
}
