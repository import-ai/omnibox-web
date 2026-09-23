import {
  createDownloadQr,
  getAppDownloadUrl,
  isMobileDownloadClient,
} from './downloadQr';

describe('download QR', () => {
  it('uses a public localized address instead of the current host', () => {
    expect(getAppDownloadUrl('zh-CN')).toBe(
      'https://www.omnibox.pro/zh-cn/download/'
    );
    expect(getAppDownloadUrl('en-US')).toBe(
      'https://www.omnibox.pro/en/download/'
    );
  });

  it.each([
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 5],
    ['Mozilla/5.0 (Linux; Android 15; Pixel 9)', 5],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', 5],
  ])(
    'excludes mobile browsers, including desktop-mode iPad: %s',
    (userAgent, maxTouchPoints) => {
      expect(isMobileDownloadClient({ userAgent, maxTouchPoints })).toBe(true);
    }
  );

  it('keeps desktop and touch-enabled Windows computers', () => {
    expect(
      isMobileDownloadClient({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)',
        maxTouchPoints: 0,
      })
    ).toBe(false);
    expect(
      isMobileDownloadClient({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        maxTouchPoints: 10,
      })
    ).toBe(false);
  });

  it.each(['zh', 'en'])(
    'preserves reserved modules around the logo (%s)',
    language => {
      const qr = createDownloadQr(getAppDownloadUrl(language));
      expect(qr.size).toBeGreaterThan(21);
      // A 36px logo must fit inside the clear area of the 144px compact QR.
      expect((qr.logoSize * 144) / (qr.size + 8)).toBeGreaterThanOrEqual(36);
      expect(qr.logoSize / qr.size).toBeGreaterThan(0.3);
      expect(qr.logoSize / qr.size).toBeLessThan(0.4);
      for (let y = qr.logoStart; y < qr.logoStart + qr.logoSize; y++) {
        for (let x = qr.logoStart; x < qr.logoStart + qr.logoSize; x++) {
          expect(qr.modules.isReserved(y, x)).toBeFalsy();
        }
      }
    }
  );
});
