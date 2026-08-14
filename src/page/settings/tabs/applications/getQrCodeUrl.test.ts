jest.mock('@/const', () => ({
  QQ_ASSISTANT_QRCODE_CONTENT: 'qq-url',
  WECHAT_ASSISTANT_QRCODE_CONTENT: 'wechat-url',
}));

import { getQrCodeUrl, TELEGRAM_ASSISTANT_URL } from './getQrCodeUrl';

describe('getQrCodeUrl', () => {
  it('builds a Telegram deep link with the binding code', () => {
    expect(getQrCodeUrl('telegram_bot', '123456')).toBe(
      `${TELEGRAM_ASSISTANT_URL}?start=123456`
    );
  });

  it('returns the Telegram bot URL without a binding code', () => {
    expect(getQrCodeUrl('telegram_bot')).toBe(TELEGRAM_ASSISTANT_URL);
  });
});
