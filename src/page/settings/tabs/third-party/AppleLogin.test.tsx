/** @jest-environment jsdom */
import { act, type ButtonHTMLAttributes } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { toast } from 'sonner';

import { http } from '@/lib/request';

import { AppleLogin } from './AppleLogin';

jest.mock('react-i18next', () => {
  const i18n = {
    get language() {
      return localStorage.getItem('i18nextLng') || 'en-US';
    },
  };
  const t = (key: string) => key;
  return { useTranslation: () => ({ t, i18n }) };
});
jest.mock('sonner', () => ({
  toast: Object.assign(jest.fn(), { error: jest.fn() }),
}));
jest.mock('@/lib/request', () => ({
  http: { get: jest.fn(), post: jest.fn() },
}));
jest.mock('@/components/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

const authConfig = {
  client_id: 'test-client',
  scope: 'name email',
  redirect_u_r_i: 'https://example.test/apple/callback',
  state: 'test-state',
  nonce: 'test-nonce',
};

let container: HTMLDivElement;
let root: Root;

function installSdk() {
  window.AppleID = {
    auth: { init: jest.fn(), signIn: jest.fn().mockResolvedValue(undefined) },
  };
}

function getScript() {
  const script = document.querySelector<HTMLScriptElement>(
    'script[src^="https://appleid.cdn-apple.com/"]'
  );
  expect(script).not.toBeNull();
  return script!;
}

beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  Reflect.deleteProperty(window, 'AppleID');
  jest.mocked(http.get).mockResolvedValue(authConfig);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  localStorage.removeItem('i18nextLng');
  Reflect.deleteProperty(window, 'AppleID');
});

it.each([
  ['en-US', 'en_US'],
  ['zh-CN', 'zh_CN'],
])(
  'keeps a failed background SDK load quiet in %s',
  async (language, locale) => {
    localStorage.setItem('i18nextLng', language);
    await act(async () => root.render(<AppleLogin />));
    const button = container.querySelector('button')!;
    expect(button.disabled).toBe(true);
    expect(getScript().src).toContain(`/${locale}/appleid.auth.js`);

    await act(async () => getScript().dispatchEvent(new Event('error')));

    expect(toast.error).not.toHaveBeenCalled();
    expect(button.disabled).toBe(true);
    expect(http.get).not.toHaveBeenCalled();
  }
);

it('enables binding when the SDK finishes loading', async () => {
  await act(async () => root.render(<AppleLogin />));
  expect(container.querySelector('button')!.disabled).toBe(true);

  installSdk();
  await act(async () => getScript().dispatchEvent(new Event('load')));

  expect(container.querySelector('button')!.disabled).toBe(false);
  expect(toast.error).not.toHaveBeenCalled();
});

it('reuses an existing SDK and starts authorization on an explicit bind click', async () => {
  installSdk();
  await act(async () => root.render(<AppleLogin />));
  expect(
    document.querySelector('script[src*="appleid.cdn-apple.com"]')
  ).toBeNull();
  const button = container.querySelector('button')!;
  expect(button.disabled).toBe(false);

  await act(async () => button.click());

  expect(window.AppleID.auth.init).toHaveBeenCalledWith({
    clientId: authConfig.client_id,
    scope: authConfig.scope,
    redirectURI: authConfig.redirect_u_r_i,
    state: authConfig.state,
    nonce: authConfig.nonce,
    usePopup: true,
  });
  expect(window.AppleID.auth.signIn).toHaveBeenCalledTimes(1);
  expect(button.disabled).toBe(false);
});

it.each([
  ['authorization_failed', true],
  ['user_cancelled_authorize', false],
  ['popup_closed_by_user', false],
])(
  'preserves authorization failure handling for %s',
  async (error, showError) => {
    installSdk();
    await act(async () => root.render(<AppleLogin />));
    await act(async () => container.querySelector('button')!.click());

    await act(async () =>
      document.dispatchEvent(
        new CustomEvent('AppleIDSignInOnFailure', { detail: { error } })
      )
    );

    if (showError) {
      expect(toast.error).toHaveBeenCalledWith('login.apple_signin_failed', {
        position: 'bottom-right',
      });
    } else {
      expect(toast.error).not.toHaveBeenCalled();
    }
  }
);
