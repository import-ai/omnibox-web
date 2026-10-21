/** @jest-environment jsdom */

import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { http } from '@/lib/request';
import { setGlobalCredential } from '@/page/user/util';

import { leaveTo, safeRedirect } from './loginLink';
import LoginLinkPage from './LoginLinkPage';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/lib/request', () => ({ http: { post: jest.fn() } }));
jest.mock('@/page/user/util', () => ({ setGlobalCredential: jest.fn() }));
jest.mock('./loginLink', () => ({
  ...jest.requireActual('./loginLink'),
  leaveTo: jest.fn(),
}));
jest.mock('./WrapperPage', () => ({
  __esModule: true,
  default: ({ children }: { children?: ReactNode }) => children,
}));
jest.mock('@/components/button', () => ({
  Button: ({ children }: { children?: ReactNode }) => children,
}));
jest.mock('@/components/ui/Spinner', () => ({ Spinner: () => null }));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const post = jest.mocked(http.post);

describe('LoginLinkPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    jest.clearAllMocks();
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
  });

  it('redeems the code, signs in and goes to the pricing page', async () => {
    window.history.replaceState(null, '', '/user/auth/login-link#code=abc');
    post.mockResolvedValue({
      id: 'user-1',
      access_token: 'jwt',
      redirect: '/zh-cn/pricing?namespace=ns-1',
    });

    await act(async () => root.render(<LoginLinkPage />));

    expect(window.location.hash).toBe('');
    expect(post).toHaveBeenCalledWith(
      '/auth/login-links/redeem',
      { code: 'abc' },
      { mute: true }
    );
    expect(setGlobalCredential).toHaveBeenCalledWith('user-1', 'jwt');
    expect(leaveTo).toHaveBeenCalledWith('/zh-cn/pricing?namespace=ns-1');
  });

  it('explains an expired or used link', async () => {
    window.history.replaceState(null, '', '/user/auth/login-link#code=used');
    post.mockRejectedValue(new Error('410'));

    await act(async () => root.render(<LoginLinkPage />));

    expect(container.textContent).toContain('login_link.invalid');
    expect(container.querySelector('a')?.getAttribute('href')).toBe(
      '/zh-cn/pricing'
    );
    expect(setGlobalCredential).not.toHaveBeenCalled();
    expect(leaveTo).not.toHaveBeenCalled();
  });

  it('explains a link without a code without calling the server', async () => {
    window.history.replaceState(null, '', '/user/auth/login-link');

    await act(async () => root.render(<LoginLinkPage />));

    expect(post).not.toHaveBeenCalled();
    expect(container.textContent).toContain('login_link.invalid');
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
