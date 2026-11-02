/** @jest-environment jsdom */
import { toast } from 'sonner';

import { removeGlobalCredential } from '@/page/user/util';

import request, { type RequestConfig } from './request';

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

async function rejectRequest(
  url: string,
  status: number,
  code?: string,
  config: RequestConfig = {}
) {
  await expect(
    request.post(
      url,
      {},
      {
        ...config,
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

describe('muteWhen', () => {
  beforeEach(() => {
    Object.assign(window.location, {
      pathname: '/user/login',
      href: 'https://test.omnibox.pro/user/login',
    });
  });

  it('skips the toast when the predicate matches the error', async () => {
    const muteWhen = jest.fn().mockReturnValue(true);
    await rejectRequest('/auth/send-otp', 403, undefined, { muteWhen });
    expect(muteWhen).toHaveBeenCalledWith(
      expect.objectContaining({ status: 403 })
    );
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('still toasts when the predicate does not match', async () => {
    await rejectRequest('/auth/send-otp', 429, 'too_many_requests', {
      muteWhen: () => false,
    });
    expect(toast.error).toHaveBeenCalledWith('Rejected', expect.anything());
  });

  it('keeps handling expired tokens when the toast is muted', async () => {
    await rejectRequest('/auth/send-otp', 401, 'TOKEN_EXPIRED', {
      muteWhen: () => true,
    });
    jest.runAllTimers();
    expect(toast.error).not.toHaveBeenCalled();
    expect(removeGlobalCredential).toHaveBeenCalled();
    expect(window.location.href).toContain('/user/login?redirect=');
  });
});

it('opts chat requests into a localized error element without exposing server text', async () => {
  await rejectRequest('/conversations', 500, 'NEW_ERROR', {
    errorContext: 'chat',
  });
  expect(toast.error).toHaveBeenCalledTimes(1);
  const shown = jest.mocked(toast.error).mock.calls[0][0] as any;
  expect(shown.props.error.response.data.message).toBe('Rejected');
  expect(typeof shown.type).toBe('function');
});

it('preserves raw error behavior for requests without chat opt-in', async () => {
  await rejectRequest('/resources', 500);
  expect(toast.error).toHaveBeenCalledWith('Rejected', {
    position: 'bottom-right',
  });
});

it('keeps chat errors muted when the caller owns the failure display', async () => {
  await rejectRequest('/conversations', 500, undefined, {
    errorContext: 'chat',
    mute: true,
  });
  expect(toast.error).not.toHaveBeenCalled();
});

it('can preserve a muted inline request authentication redirect without a second error toast', async () => {
  await rejectRequest('/root', 401, undefined, {
    errorContext: 'chat',
    mute: true,
    redirectOnUnauthorized: true,
  });
  expect(toast.error).not.toHaveBeenCalled();
  jest.runAllTimers();
  expect(window.location.href).toContain('/user/login');
  expect(removeGlobalCredential).toHaveBeenCalled();
});
