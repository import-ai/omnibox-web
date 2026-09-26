/** @jest-environment jsdom */
import { removeGlobalCredential } from '@/page/user/util';

import request from './request';

jest.mock('lodash-es', () => ({
  isUndefined: (value: unknown) => value === undefined,
}));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));
jest.mock('i18next', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));
jest.mock('@/const', () => ({ API_BASE_URL: '/api/v1' }));
jest.mock('@/page/user/util', () => ({ removeGlobalCredential: jest.fn() }));
jest.mock('@/lib/detectLanguage', () => ({
  detectBrowserLanguage: () => 'en',
}));

const originalLocation = window.location;
const oauth =
  'https://test.omnibox.pro/oauth/authorize?client_id=omnibox-desktop&state=state&code_challenge=challenge';

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { pathname: '/oauth/authorize', href: oauth },
  });
});
afterEach(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: originalLocation,
  });
  jest.useRealTimers();
});

async function rejectRequest(url: string, status: number, code?: string) {
  await expect(
    request.post(
      url,
      {},
      {
        adapter: async config =>
          Promise.reject({
            status,
            response: { status, data: { code, message: 'Rejected' } },
            config,
          }),
      }
    )
  ).rejects.toBeDefined();
}

it.each([
  ['/oauth/authorize/context', undefined],
  ['/oauth/authorize', undefined],
  ['/oauth/authorize/context', 'TOKEN_EXPIRED'],
  ['/oauth/authorize', 'INVALID_TOKEN'],
])(
  'preserves OAuth continuation after %s rejects authentication (%s)',
  async (url, code) => {
    await rejectRequest(url, 401, code);
    // The page may navigate before the interceptor's delayed redirect runs.
    window.location.href = '/user/login';
    jest.runAllTimers();
    const target = new URL(window.location.href, 'https://test.omnibox.pro');
    expect(target.pathname).toBe('/user/login');
    expect(target.searchParams.get('redirect')).toBe(oauth);
    expect(removeGlobalCredential).toHaveBeenCalled();
  }
);

it('leaves non-authentication errors on the authorization page', async () => {
  await rejectRequest('/oauth/authorize', 500);
  jest.runAllTimers();
  expect(window.location.href).toBe(oauth);
  expect(removeGlobalCredential).not.toHaveBeenCalled();
});

it('preserves existing ordinary-page invalid-token navigation', async () => {
  Object.assign(window.location, {
    pathname: '/space/chat',
    href: 'https://test.omnibox.pro/space/chat',
  });
  await rejectRequest('/namespaces', 401, 'INVALID_TOKEN');
  jest.runAllTimers();
  expect(window.location.href).toBe('/user/login');
});
