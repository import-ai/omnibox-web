import type { Application } from '@/interface';

import { beginQrCodeBind, isQrCodeExpired } from './beginQrCodeBind';

const NOW = Date.parse('2026-10-20T00:00:00Z');

function application(partial: Partial<Application> = {}): Application {
  return {
    id: 'app-1',
    namespace_id: 'ns',
    user_id: 'user',
    app_id: 'wechat_oa_bot',
    ...partial,
  };
}

describe('isQrCodeExpired', () => {
  it('keeps a QR code with time left', () => {
    expect(
      isQrCodeExpired({ qrcode_expires_at: '2026-11-19T00:00:00Z' }, NOW)
    ).toBe(false);
  });

  it.each([
    '2026-10-19T00:00:00Z',
    '2026-10-20T00:05:00Z',
    'not-a-date',
    undefined,
  ])('replaces a QR code expiring at %s', expiresAt => {
    expect(isQrCodeExpired({ qrcode_expires_at: expiresAt }, NOW)).toBe(true);
  });
});

describe('beginQrCodeBind', () => {
  it('reports an application that already has an api key', async () => {
    const bindApplication = jest.fn();
    const unbindApplication = jest.fn();

    await expect(
      beginQrCodeBind(
        application({ api_key_id: 'key-1' }),
        bindApplication,
        unbindApplication,
        NOW
      )
    ).resolves.toEqual({ status: 'already_bound' });
    expect(bindApplication).not.toHaveBeenCalled();
    expect(unbindApplication).not.toHaveBeenCalled();
  });

  it('reuses a pending QR code that has not expired', async () => {
    const current = application({
      attrs: {
        key: '123456',
        qrcode_content: 'http://weixin.qq.com/q/current',
        qrcode_expires_at: '2026-11-19T00:00:00Z',
      },
    });
    const bindApplication = jest.fn();
    const unbindApplication = jest.fn();

    await expect(
      beginQrCodeBind(current, bindApplication, unbindApplication, NOW)
    ).resolves.toEqual({
      status: 'ready',
      qrcodeContent: 'http://weixin.qq.com/q/current',
      application: current,
      resumed: true,
    });
    expect(bindApplication).not.toHaveBeenCalled();
    expect(unbindApplication).not.toHaveBeenCalled();
  });

  it('cancels a pending binding whose QR code expired and starts again', async () => {
    const created = application({
      id: 'app-2',
      attrs: {
        key: '654321',
        qrcode_content: 'http://weixin.qq.com/q/new',
        qrcode_expires_at: '2026-11-19T00:00:00Z',
      },
    });
    const bindApplication = jest.fn().mockResolvedValue(created);
    const unbindApplication = jest.fn().mockResolvedValue(undefined);

    await expect(
      beginQrCodeBind(
        application({
          attrs: {
            key: '123456',
            qrcode_content: 'http://weixin.qq.com/q/old',
            qrcode_expires_at: '2026-10-19T00:00:00Z',
          },
        }),
        bindApplication,
        unbindApplication,
        NOW
      )
    ).resolves.toEqual({
      status: 'ready',
      qrcodeContent: 'http://weixin.qq.com/q/new',
      application: created,
      resumed: false,
    });
    expect(unbindApplication).toHaveBeenCalledWith('app-1', {
      showLoading: false,
    });
    expect(bindApplication).toHaveBeenCalledWith('wechat_oa_bot');
  });

  it('starts a binding for an application without a record', async () => {
    const created = application({
      attrs: { qrcode_content: 'http://weixin.qq.com/q/new' },
    });
    const bindApplication = jest.fn().mockResolvedValue(created);
    const unbindApplication = jest.fn();

    const result = await beginQrCodeBind(
      { app_id: 'wechat_oa_bot' } as Application,
      bindApplication,
      unbindApplication,
      NOW
    );

    expect(result).toMatchObject({
      status: 'ready',
      qrcodeContent: 'http://weixin.qq.com/q/new',
    });
    expect(unbindApplication).not.toHaveBeenCalled();
  });
});
