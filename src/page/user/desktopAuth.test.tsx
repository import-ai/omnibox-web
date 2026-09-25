/** @jest-environment jsdom */
import { act, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

import { http } from '@/lib/request';

import OAuthAuthorizePage from '../oauth/OAuthAuthorizePage';
import Apple from './apple';
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
  const params = {
    client_id: 'omnibox-desktop',
    response_type: 'code',
    redirect_uri: 'omnibox://oauth/callback',
    state: 's'.repeat(43),
    code_challenge: 'a'.repeat(43),
    code_challenge_method: 'S256',
  };
  const redirect = `/oauth/authorize?${new URLSearchParams(params)}`;
  history.replaceState({}, '', redirect);
  localStorage.setItem('uid', 'user');
  jest.mocked(http.get).mockResolvedValue({
    client: { first_party: true, name: 'OmniBox Desktop' },
    account: { id: 'user', username: 'Alice' },
  });
  jest.mocked(http.post).mockResolvedValue({
    redirect_url: `omnibox://oauth/callback?code=${'b'.repeat(64)}&state=${params.state}`,
  });
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    await act(async () => root.render(<OAuthAuthorizePage />));
    expect(http.post).not.toHaveBeenCalled();
    expect(openApp).not.toHaveBeenCalled();
    await act(async () => container.querySelector('button')!.click());
    expect(http.post).toHaveBeenCalledWith('/oauth/authorize', {
      ...params,
      user_id: 'user',
    });
    expect(openApp).toHaveBeenCalledTimes(1);
    expect(container.querySelector('a')?.href).toContain(
      'omnibox://oauth/callback'
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

it('routes OAuth requests through the existing web login', async () => {
  localStorage.clear();
  const redirect = '/oauth/authorize?client_id=omnibox-desktop&state=example';
  history.replaceState({}, '', redirect);
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    await act(async () => root.render(<OAuthAuthorizePage />));
    const link = container.querySelector(
      'a[data-login-redirect]'
    ) as HTMLAnchorElement;
    expect(new URL(link.href).pathname).toBe('/user/login');
    expect(new URL(link.href).searchParams.get('redirect')).toBe(redirect);
  } finally {
    await act(async () => root.unmount());
  }
});

it.each([
  'https://example.com/callback',
  `omnibox://app/callback?code=${'b'.repeat(64)}&state=${'s'.repeat(43)}`,
  `omnibox://oauth/callback?code=${'b'.repeat(64)}&state=wrong`,
])('never opens an invalid OAuth callback: %s', async redirect_url => {
  history.replaceState(
    {},
    '',
    `/oauth/authorize?client_id=omnibox-desktop&state=${'s'.repeat(43)}`
  );
  localStorage.setItem('uid', 'user');
  jest.mocked(http.get).mockResolvedValue({
    client: { first_party: true },
    account: { id: 'user', username: 'Alice' },
  });
  jest.mocked(http.post).mockResolvedValue({ redirect_url });
  const openApp = jest
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(() => {});
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    await act(async () => root.render(<OAuthAuthorizePage />));
    await act(async () => container.querySelector('button')!.click());
    expect(openApp).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
  } finally {
    await act(async () => root.unmount());
    localStorage.clear();
    openApp.mockRestore();
  }
});
