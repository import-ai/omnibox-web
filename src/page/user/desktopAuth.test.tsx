/** @jest-environment jsdom */
import { act, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

import { http } from '@/lib/request';

import Apple from './apple';
import DesktopAuthPage from './DesktopAuthPage';
import DesktopLoginPage from './DesktopLoginPage';
import { EmbeddedAuthContext } from './EmbeddedAuthContext';

jest.mock('@/components/button', () => ({
  Button: ({
    children,
    loading,
    asChild,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & {
    loading?: boolean;
    asChild?: boolean;
  }) =>
    asChild ? (
      children
    ) : (
      <button {...props} disabled={loading || props.disabled}>
        {children}
      </button>
    ),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));
jest.mock('@/lib/request', () => ({
  http: { get: jest.fn(), post: jest.fn() },
}));
jest.mock('./WrapperPage', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => children,
}));
jest.mock('./wechat/ScanForm', () => ({ ScanForm: () => null }));
jest.mock('./util', () => ({ removeGlobalCredential: jest.fn() }));
jest.mock('@/page/inviteReferral/completeAuth', () => ({
  completeAuthRedirect: jest.fn(),
}));
jest.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(location.search), jest.fn()],
  Navigate: ({ to }: { to: string }) => <a data-login-redirect href={to} />,
}));
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

it('uses the host without loading Apple SDK and allows cancellation', async () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  let finish!: () => void;
  const login = jest.fn(
    () =>
      new Promise<void>(resolve => {
        finish = resolve;
      })
  );
  const cancel = jest.fn(async () => finish());
  try {
    await act(async () =>
      root.render(
        <EmbeddedAuthContext.Provider value={{ login, cancel }}>
          <Apple />
        </EmbeddedAuthContext.Provider>
      )
    );
    expect(document.querySelector('script[src*="appleid"]')).toBeNull();
    expect(http.get).not.toHaveBeenCalled();
    await act(async () => container.querySelector('button')!.click());
    expect(login).toHaveBeenCalledWith('apple');
    expect(container.querySelector('[role="status"]')).not.toBeNull();
    await act(async () => container.querySelectorAll('button')[1].click());
    expect(cancel).toHaveBeenCalled();
    expect(container.querySelector('[role="status"]')).toBeNull();
  } finally {
    await act(async () => root.unmount());
  }
});

it('requires account confirmation before issuing a desktop handoff', async () => {
  const openApp = jest
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(() => {});
  const transaction = 'a'.repeat(64);
  const redirect = `/user/desktop-auth?transaction=${transaction}&provider=google`;
  history.replaceState(
    {},
    '',
    `${redirect}&redirect=${encodeURIComponent(redirect)}`
  );
  localStorage.setItem('uid', 'user');
  jest.mocked(http.get).mockResolvedValue({ id: 'user', username: 'Alice' });
  jest.mocked(http.post).mockResolvedValue({
    callback_url: `omnibox-auth-test://login?transaction=${transaction}&code=${'b'.repeat(64)}&state=${'s'.repeat(43)}`,
  });
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    await act(async () => root.render(<DesktopAuthPage />));
    expect(http.post).not.toHaveBeenCalled();
    expect(openApp).not.toHaveBeenCalled();
    await act(async () => container.querySelector('button')!.click());
    expect(http.post).toHaveBeenCalledWith('/desktop-auth/authorize', {
      transaction,
      user_id: 'user',
    });
    expect(openApp).toHaveBeenCalledTimes(1);
    expect(container.querySelector('a')?.href).toContain(
      'omnibox-auth-test://login'
    );
  } finally {
    await act(async () => root.unmount());
    localStorage.clear();
    openApp.mockRestore();
  }
});

it('offers only browser sign-in in the desktop and supports cancellation', async () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  let finish!: () => void;
  const login = jest.fn(
    () =>
      new Promise<void>(resolve => {
        finish = resolve;
      })
  );
  const cancel = jest.fn(async () => finish());
  try {
    await act(async () =>
      root.render(<DesktopLoginPage host={{ login, cancel }} />)
    );
    expect(container.querySelector('input')).toBeNull();
    expect(container.querySelectorAll('button')).toHaveLength(1);
    await act(async () => container.querySelector('button')!.click());
    expect(login).toHaveBeenCalledWith(undefined, 'browser');
    expect(container.querySelector('[role="status"]')).not.toBeNull();
    await act(async () =>
      [...container.querySelectorAll('button')]
        .find(b => b.textContent === 'desktop_auth.cancel')!
        .click()
    );
    expect(cancel).toHaveBeenCalled();
    expect(container.querySelector('[role="status"]')).toBeNull();
  } finally {
    await act(async () => root.unmount());
  }
});

it('routes provider-free desktop transactions through the existing web login', async () => {
  localStorage.clear();
  const transaction = 'c'.repeat(64);
  history.replaceState({}, '', `/user/desktop-auth?transaction=${transaction}`);
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    await act(async () => root.render(<DesktopAuthPage />));
    const link = container.querySelector(
      'a[data-login-redirect]'
    ) as HTMLAnchorElement;
    expect(new URL(link.href).pathname).toBe('/user/login');
    expect(new URL(link.href).searchParams.get('redirect')).toBe(
      `/user/desktop-auth?transaction=${transaction}`
    );
  } finally {
    await act(async () => root.unmount());
  }
});
