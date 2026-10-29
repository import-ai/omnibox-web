/** @jest-environment jsdom */

import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { http } from '@/lib/request';
import { setGlobalCredential } from '@/page/user/util';

import {
  failureKind,
  isWechatBrowser,
  leaveTo,
  OAUTH_STATE_KEY,
  safeRedirect,
} from './loginLink';
import LoginLinkPage from './LoginLinkPage';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/lib/request', () => ({
  http: { get: jest.fn(), post: jest.fn() },
}));
jest.mock('@/page/user/util', () => ({ setGlobalCredential: jest.fn() }));
jest.mock('./loginLink', () => ({
  ...jest.requireActual('./loginLink'),
  leaveTo: jest.fn(),
}));
jest.mock('./WrapperPage', () => ({
  __esModule: true,
  default: ({ children }: { children?: ReactNode }) => children,
}));
jest.mock('@/components/Button', () => ({
  Button: ({ children }: { children?: ReactNode }) => children,
}));
jest.mock('@/components/ui/Spinner', () => ({ Spinner: () => null }));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const get = jest.mocked(http.get);
const post = jest.mocked(http.post);
const WECHAT_UA =
  'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Mobile MicroMessenger/8.0.50';

function setUserAgent(userAgent: string) {
  Object.defineProperty(window.navigator, 'userAgent', {
    value: userAgent,
    configurable: true,
  });
}

function apiError(code: string, status = 400) {
  return Object.assign(new Error(code), {
    response: { status, data: { code } },
  });
}

describe('LoginLinkPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
    setUserAgent(WECHAT_UA);
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
  });

  it('starts WeChat OAuth on first open, ignoring an old link code', async () => {
    window.history.replaceState(null, '', '/user/auth/login-link#code=old');
    get.mockResolvedValue({
      auth_url: 'https://open.weixin.qq.com/connect/oauth2/authorize?x=1',
      state: 'state-1',
    });

    await act(async () => root.render(<LoginLinkPage />));

    expect(get).toHaveBeenCalledWith('/wechat-oa/login/authorize', {
      mute: true,
    });
    expect(window.sessionStorage.getItem(OAUTH_STATE_KEY)).toBe('state-1');
    expect(leaveTo).toHaveBeenCalledWith(
      'https://open.weixin.qq.com/connect/oauth2/authorize?x=1'
    );
    expect(post).not.toHaveBeenCalled();
  });

  it('asks to open the link in WeChat outside WeChat', async () => {
    setUserAgent('Mozilla/5.0 (Macintosh) Safari/605.1.15');
    window.history.replaceState(null, '', '/user/auth/login-link');

    await act(async () => root.render(<LoginLinkPage />));

    expect(get).not.toHaveBeenCalled();
    expect(leaveTo).not.toHaveBeenCalled();
    expect(container.textContent).toContain('login_link.not_wechat');
    expect(container.querySelector('a')?.getAttribute('href')).toBe(
      '/zh-cn/pricing'
    );
  });

  it('signs in from the OAuth callback and goes to the pricing page', async () => {
    window.sessionStorage.setItem(OAUTH_STATE_KEY, 'state-1');
    window.history.replaceState(
      null,
      '',
      '/user/auth/login-link?code=wx-code&state=state-1'
    );
    post.mockResolvedValue({
      id: 'user-1',
      access_token: 'jwt',
      redirect: '/zh-cn/pricing?namespace=ns-1',
    });

    await act(async () => root.render(<LoginLinkPage />));

    expect(window.location.search).toBe('');
    expect(window.sessionStorage.getItem(OAUTH_STATE_KEY)).toBeNull();
    expect(post).toHaveBeenCalledWith(
      '/wechat-oa/login',
      { code: 'wx-code', state: 'state-1' },
      { mute: true }
    );
    expect(setGlobalCredential).toHaveBeenCalledWith('user-1', 'jwt');
    expect(leaveTo).toHaveBeenCalledWith('/zh-cn/pricing?namespace=ns-1');
  });

  it.each([
    ['a state this tab did not save', 'other-state'],
    ['no saved state', null],
  ])('rejects a callback with %s', async (_name, saved) => {
    if (saved) window.sessionStorage.setItem(OAUTH_STATE_KEY, saved);
    window.history.replaceState(
      null,
      '',
      '/user/auth/login-link?code=wx-code&state=state-1'
    );

    await act(async () => root.render(<LoginLinkPage />));

    expect(window.location.search).toBe('');
    expect(post).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
    expect(container.textContent).toContain('login_link.failed');
  });

  it.each([
    ['WECHAT_OA_NOT_BOUND', 'login_link.not_bound'],
    ['wechat_oa_not_owner', 'login_link.not_owner'],
    ['wechat_oa_login_failed', 'login_link.failed'],
  ])('explains a %s login error', async (code, message) => {
    window.sessionStorage.setItem(OAUTH_STATE_KEY, 'state-1');
    window.history.replaceState(
      null,
      '',
      '/user/auth/login-link?code=wx-code&state=state-1'
    );
    post.mockRejectedValue(apiError(code));

    await act(async () => root.render(<LoginLinkPage />));

    expect(container.textContent).toContain(message);
    expect(setGlobalCredential).not.toHaveBeenCalled();
    expect(leaveTo).not.toHaveBeenCalled();
  });

  it('asks to retry later when the login is rate limited', async () => {
    window.sessionStorage.setItem(OAUTH_STATE_KEY, 'state-1');
    window.history.replaceState(
      null,
      '',
      '/user/auth/login-link?code=wx-code&state=state-1'
    );
    post.mockRejectedValue(apiError('wechat_oa_login_too_frequent', 429));

    await act(async () => root.render(<LoginLinkPage />));

    expect(container.textContent).toContain('login_link.too_frequent');
    expect(container.querySelector('a')?.getAttribute('href')).toBe(
      '/zh-cn/pricing'
    );
    expect(setGlobalCredential).not.toHaveBeenCalled();
  });

  it('maps any HTTP 429 to the rate limit failure', () => {
    expect(failureKind(apiError('', 429))).toBe('too_frequent');
  });

  it('recognises the WeChat browser', () => {
    expect(isWechatBrowser(WECHAT_UA)).toBe(true);
    expect(isWechatBrowser('Mozilla/5.0 Chrome/120')).toBe(false);
    expect(
      isWechatBrowser(
        'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 MicroMessenger/8.0.50 wxwork/4.1.30'
      )
    ).toBe(false);
  });

  it('maps unknown errors to the generic failure', () => {
    expect(failureKind(new Error('network'))).toBe('failed');
    expect(failureKind(undefined)).toBe('failed');
  });

  it('only follows same-origin redirects', () => {
    expect(safeRedirect('/zh-cn/pricing?namespace=x')).toBe(
      '/zh-cn/pricing?namespace=x'
    );
    expect(safeRedirect('//evil.example')).toBe('/zh-cn/pricing');
    expect(safeRedirect('https://evil.example')).toBe('/zh-cn/pricing');
    expect(safeRedirect(undefined)).toBe('/zh-cn/pricing');
  });
});
