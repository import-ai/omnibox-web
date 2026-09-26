/** @jest-environment jsdom */
import { act, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

import { http } from '@/lib/request';

import OAuthAuthorizePage from './OAuthAuthorizePage';

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
jest.mock('@/components/ui/Spinner', () => ({ Spinner: () => null }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/lib/request', () => ({
  http: { get: jest.fn(), post: jest.fn() },
}));
jest.mock('@/page/user/WrapperPage', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => children,
}));
jest.mock('@/page/user/util', () => ({ removeGlobalCredential: jest.fn() }));
jest.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(location.search)],
  Navigate: ({ to }: { to: string }) => <a data-login-redirect href={to} />,
}));
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const params = {
  client_id: 'omnibox-desktop',
  response_type: 'code',
  redirect_uri: 'omnibox://oauth/callback',
  state: 's'.repeat(43),
  code_challenge: 'a'.repeat(43),
  code_challenge_method: 'S256',
};

async function render() {
  const container = document.createElement('div');
  const root = createRoot(container);
  await act(async () => root.render(<OAuthAuthorizePage />));
  return { container, unmount: () => act(async () => root.unmount()) };
}

afterEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

it('routes unauthenticated requests through the existing web login', async () => {
  const redirect = `/oauth/authorize?${new URLSearchParams(params)}`;
  history.replaceState({}, '', redirect);
  const { container, unmount } = await render();
  const link = container.querySelector(
    'a[data-login-redirect]'
  ) as HTMLAnchorElement;
  expect(new URL(link.href).pathname).toBe('/user/login');
  expect(new URL(link.href).searchParams.get('redirect')).toBe(redirect);
  await unmount();
});

it('requires account confirmation before returning to the desktop', async () => {
  history.replaceState(
    {},
    '',
    `/oauth/authorize?${new URLSearchParams(params)}`
  );
  localStorage.setItem('uid', 'user');
  jest.mocked(http.get).mockResolvedValue({
    account: { id: 'user', username: 'Alice' },
  });
  const callback = `omnibox://oauth/callback?code=${'b'.repeat(64)}&state=${params.state}`;
  jest.mocked(http.post).mockResolvedValue({ redirect_url: callback });
  const { container, unmount } = await render();
  expect(http.get).toHaveBeenCalledWith('/oauth/authorize/context', {
    params,
  });
  expect(http.post).not.toHaveBeenCalled();
  await act(async () => container.querySelector('button')!.click());
  expect(http.post).toHaveBeenCalledWith('/oauth/authorize', {
    ...params,
    user_id: 'user',
  });
  expect(container.querySelector('a')?.getAttribute('href')).toBe(callback);
  await unmount();
});

it('never opens a non-desktop callback', async () => {
  history.replaceState(
    {},
    '',
    `/oauth/authorize?${new URLSearchParams(params)}`
  );
  localStorage.setItem('uid', 'user');
  jest.mocked(http.get).mockResolvedValue({
    account: { id: 'user', username: 'Alice' },
  });
  jest
    .mocked(http.post)
    .mockResolvedValue({ redirect_url: 'https://example.com/callback' });
  const { container, unmount } = await render();
  await act(async () => container.querySelector('button')!.click());
  expect(container.querySelector('a')).toBeNull();
  expect(container.querySelector('[role="alert"]')).not.toBeNull();
  await unmount();
});

it('keeps the direct authorization flow for third-party clients', async () => {
  const query = { ...params, client_id: 'third-party' };
  history.replaceState(
    {},
    '',
    `/oauth/authorize?${new URLSearchParams(query)}`
  );
  localStorage.setItem('uid', 'user');
  jest.mocked(http.get).mockReturnValue(new Promise(() => {}));
  const { unmount } = await render();
  expect(http.get).toHaveBeenCalledTimes(1);
  expect(http.get).toHaveBeenCalledWith('/oauth/authorize', { params: query });
  await unmount();
});
