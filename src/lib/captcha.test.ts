import { captchaResultFromError, isCaptchaRejection } from './captcha';

jest.mock('@/lib/request', () => ({ http: { get: jest.fn() } }));

function httpError(status: number, data?: Record<string, unknown>) {
  return { status, response: { status, data } };
}

describe('isCaptchaRejection', () => {
  it('matches the captcha guard 403, which carries no code', () => {
    expect(
      isCaptchaRejection(
        httpError(403, { message: 'Captcha verification failed' })
      )
    ).toBe(true);
    expect(isCaptchaRejection(httpError(403, { code: '' }))).toBe(true);
    expect(isCaptchaRejection(httpError(403))).toBe(true);
  });

  it.each([
    ['a coded 403', httpError(403, { code: 'user_not_owner_or_admin' })],
    ['a 400', httpError(400, { message: 'Bad request' })],
    ['a 429', httpError(429, { code: 'too_many_requests' })],
    ['a 500', httpError(500)],
    ['a network error', new Error('Network Error')],
    ['nothing', undefined],
  ])('does not match %s', (_label, error) => {
    expect(isCaptchaRejection(error)).toBe(false);
  });
});

describe('captchaResultFromError', () => {
  it('refreshes the challenge on a captcha rejection', () => {
    expect(
      captchaResultFromError(httpError(403, { message: 'Captcha failed' }))
    ).toEqual({
      captchaResult: false,
      bizResult: false,
      message: 'Captcha failed',
    });
  });

  it('reports any other failure as a business failure', () => {
    expect(
      captchaResultFromError(
        httpError(403, { code: 'forbidden', message: 'Forbidden' })
      )
    ).toEqual({ captchaResult: true, bizResult: false, message: 'Forbidden' });
    expect(captchaResultFromError(httpError(500))).toEqual({
      captchaResult: true,
      bizResult: false,
      message: undefined,
    });
    expect(captchaResultFromError(new Error('Network Error'))).toEqual({
      captchaResult: true,
      bizResult: false,
      message: undefined,
    });
  });
});
