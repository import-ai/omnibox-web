/** @jest-environment jsdom */

import { createInstance } from 'i18next';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';

import en from '@/i18n/locales/en.json';
import zh from '@/i18n/locales/zh.json';
import { http } from '@/lib/request';

import {
  AgreementCheckbox,
  AgreementConsentProvider,
} from '../AgreementConsent';
import Apple from './index';

jest.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams()],
}));
jest.mock('sonner', () => ({
  toast: Object.assign(jest.fn(), { error: jest.fn() }),
}));
jest.mock('@/lib/request', () => ({
  http: { get: jest.fn(), post: jest.fn() },
}));
jest.mock('@/page/inviteReferral/completeAuth', () => ({
  completeAuthRedirect: jest.fn(),
}));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const prefetched = {
  client_id: 'prefetched-client',
  scope: 'name email',
  redirect_u_r_i: 'https://example.test/apple/prefetched',
  state: 'prefetched-state',
  nonce: 'prefetched-nonce',
};

interface Deferred {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}

const i18n = createInstance();
let container: HTMLDivElement;
let root: Root;
let requests: Deferred[];

function button(text: string) {
  const match = [...document.querySelectorAll('button')].find(node =>
    node.textContent?.includes(text)
  );
  if (!match) throw new Error(`missing button ${text}`);
  return match as HTMLButtonElement;
}

function dialog() {
  return document.querySelector('[role="dialog"]');
}

beforeAll(async () => {
  await i18n.init({
    lng: 'zh',
    resources: { zh: { translation: zh }, en: { translation: en } },
    interpolation: { escapeValue: false },
  });
});

beforeEach(() => {
  jest.clearAllMocks();
  window.AppleID = {
    auth: { init: jest.fn(), signIn: jest.fn().mockResolvedValue(undefined) },
  };
  requests = [];
  jest.mocked(http.get).mockImplementation(
    () =>
      new Promise((resolve, reject) => {
        requests.push({ resolve, reject });
      })
  );
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  Reflect.deleteProperty(window, 'AppleID');
});

async function renderApple(extra?: ReactNode) {
  await act(async () =>
    root.render(
      <I18nextProvider i18n={i18n}>
        <AgreementConsentProvider scopeKey="login">
          {extra}
          <Apple />
        </AgreementConsentProvider>
      </I18nextProvider>
    )
  );
}

async function resolveConfig(index = 0, config = prefetched) {
  await act(async () => {
    requests[index].resolve(config);
  });
}

it('does not start Apple sign-in while the auth config is still loading', async () => {
  await renderApple();
  const apple = button('使用 Apple 登录');

  expect(apple.disabled).toBe(true);
  expect(http.get).toHaveBeenCalledTimes(1);
  await act(async () => apple.click());

  expect(dialog()).toBeNull();
  expect(window.AppleID.auth.init).not.toHaveBeenCalled();
  expect(window.AppleID.auth.signIn).not.toHaveBeenCalled();
});

it('starts sign-in from the confirmation click without requesting config again', async () => {
  await renderApple();
  await resolveConfig();
  expect(button('使用 Apple 登录').disabled).toBe(false);

  await act(async () => button('使用 Apple 登录').click());
  expect(dialog()).not.toBeNull();
  expect(window.AppleID.auth.signIn).not.toHaveBeenCalled();

  await act(async () => {
    button('同意并继续').click();
    expect(window.AppleID.auth.signIn).toHaveBeenCalledTimes(1);
  });

  expect(http.get).toHaveBeenCalledTimes(1);
  expect(window.AppleID.auth.init).toHaveBeenCalledWith({
    clientId: prefetched.client_id,
    scope: prefetched.scope,
    redirectURI: prefetched.redirect_u_r_i,
    state: prefetched.state,
    nonce: prefetched.nonce,
    usePopup: true,
  });
});

it('does not authorize when the agreement is declined', async () => {
  await renderApple();
  await resolveConfig();

  await act(async () => button('使用 Apple 登录').click());
  await act(async () => button('不同意').click());

  expect(dialog()).toBeNull();
  expect(window.AppleID.auth.signIn).not.toHaveBeenCalled();
});

it('ignores a repeated Apple click while agreement is pending', async () => {
  await renderApple();
  await resolveConfig();

  await act(async () => {
    button('使用 Apple 登录').click();
    button('使用 Apple 登录').click();
  });
  await act(async () => button('同意并继续').click());

  expect(window.AppleID.auth.signIn).toHaveBeenCalledTimes(1);
  expect(http.get).toHaveBeenCalledTimes(1);
});

it('starts sign-in once when agreement was already accepted', async () => {
  await renderApple(<AgreementCheckbox />);
  await resolveConfig();

  await act(async () =>
    (container.querySelector('[role="checkbox"]') as HTMLElement).click()
  );
  await act(async () => {
    const apple = button('使用 Apple 登录');
    apple.click();
    apple.click();
  });

  expect(dialog()).toBeNull();
  expect(window.AppleID.auth.signIn).toHaveBeenCalledTimes(1);
});

it('keeps Apple clickable after a config failure and retries without authorizing', async () => {
  await renderApple();
  await act(async () => {
    requests[0].reject(new Error('config failed'));
  });

  const apple = button('使用 Apple 登录');
  expect(apple.disabled).toBe(false);
  expect(window.AppleID.auth.signIn).not.toHaveBeenCalled();

  await act(async () => apple.click());

  expect(dialog()).toBeNull();
  expect(http.get).toHaveBeenCalledTimes(2);
  expect(window.AppleID.auth.signIn).not.toHaveBeenCalled();
  expect(button('使用 Apple 登录').disabled).toBe(true);

  await resolveConfig(1);
  expect(button('使用 Apple 登录').disabled).toBe(false);

  await act(async () => button('使用 Apple 登录').click());
  await act(async () => {
    button('同意并继续').click();
    expect(window.AppleID.auth.signIn).toHaveBeenCalledTimes(1);
  });
  expect(http.get).toHaveBeenCalledTimes(2);
});
