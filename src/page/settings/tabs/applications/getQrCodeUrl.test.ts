jest.mock('@/const', () => ({
  QQ_ASSISTANT_QRCODE_CONTENT: 'qq-url',
  WECHAT_ASSISTANT_QRCODE_CONTENT: 'wechat-url',
}));

import { getQrCodeUrl, TELEGRAM_ASSISTANT_URL } from './getQrCodeUrl';

describe('getQrCodeUrl', () => {
  it('uses a valid QQ binding link', () => {
    expect(
      getQrCodeUrl('qq_bot', '123456', 'https://qun.qq.com/qq-binding')
    ).toBe('https://qun.qq.com/qq-binding');
  });

  it.each([undefined, '', 'not-a-url', 'http://qun.qq.com/qq-binding'])(
    'falls back to the fixed QQ URL for %s',
    urlLink => {
      expect(getQrCodeUrl('qq_bot', '123456', urlLink)).toBe('qq-url');
    }
  );

  it('builds a Telegram deep link with the binding code', () => {
    expect(getQrCodeUrl('telegram_bot', '123456')).toBe(
      `${TELEGRAM_ASSISTANT_URL}?start=123456`
    );
  });

  it('returns the Telegram bot URL without a binding code', () => {
    expect(getQrCodeUrl('telegram_bot')).toBe(TELEGRAM_ASSISTANT_URL);
  });
});
