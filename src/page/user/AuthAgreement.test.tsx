/** @jest-environment jsdom */

import { createInstance } from 'i18next';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';

import { TooltipProvider } from '@/components/tooltip';
import { useCaptcha } from '@/hooks/useCaptcha';
import en from '@/i18n/locales/en.json';
import { http } from '@/lib/request';

import {
  AgreementCheckbox,
  AgreementConsentProvider,
} from './AgreementConsent';
import Apple from './apple';
import Google from './google';
import { LoginForm } from './login/LoginForm';
import { RegisterForm } from './register/RegisterForm';
import WeChat from './wechat';
import { prepareH5WechatOAuthState } from './wechat/h5WechatAuthSync';
import {
  isExternalMobileBrowser,
  launchWechatMiniProgram,
} from './wechat/launchMiniProgram';

let params = new URLSearchParams();
const navigate = jest.fn();
jest.mock('@/lib/trackButtonClick', () => ({
  trackButtonClick: jest.fn(),
  onOverlayClose: () => jest.fn(),
}));
jest.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useSearchParams: () => [params],
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
jest.mock('@/const', () => ({ ALLOWED_PHONE_COUNTRIES: ['CN'] }));
jest.mock('@/lib/request', () => ({
  http: { get: jest.fn(), post: jest.fn() },
}));
jest.mock('@/hooks/useCaptcha', () => ({ useCaptcha: jest.fn() }));
jest.mock('@/hooks/usePhoneConfig', () => ({
  usePhoneConfig: () => ({ allowedCountries: ['CN'] }),
}));
jest.mock('@/components/captcha/CaptchaMount', () => ({
  CaptchaMount: () => null,
}));
jest.mock('@/page/inviteReferral/InviteCodeEntry', () => ({
  InviteCodeEntry: () => null,
}));
jest.mock('@/page/inviteReferral/completeAuth', () => ({
  completeAuthRedirect: jest.fn(),
}));
jest.mock('./wechat/h5WechatAuthSync', () => ({
  prepareH5WechatOAuthState: jest.fn(),
}));
jest.mock('./wechat/launchMiniProgram', () => ({
  isExternalMobileBrowser: jest.fn(),
  launchWechatMiniProgram: jest.fn(),
}));
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const i18n = createInstance();
const captchaRun = jest.fn();
let root: Root;
let container: HTMLDivElement;
let originalApple: Window['AppleID'];
const ua = navigator.userAgent;
const confirm = () =>
  [...document.querySelectorAll('button')].find(
    node => node.textContent === 'Agree and Continue'
  )!;
const decline = () =>
  [...document.querySelectorAll('button')].find(
    node => node.textContent === 'Disagree'
  )!;
async function click(node: Element) {
  await act(async () => (node as HTMLElement).click());
}
async function render(children: ReactNode) {
  await act(async () =>
    root.render(
      <I18nextProvider i18n={i18n}>
        <TooltipProvider>
          <AgreementConsentProvider scopeKey="test">
            <AgreementCheckbox />
            {children}
          </AgreementConsentProvider>
        </TooltipProvider>
      </I18nextProvider>
    )
  );
}
function input(selector: string, value: string) {
  const node = container.querySelector(selector) as HTMLInputElement;
  Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value'
  )!.set!.call(node, value);
  node.dispatchEvent(new Event('input', { bubbles: true }));
}
async function submit() {
  await act(async () => {
    container
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
}
beforeAll(async () => {
  await i18n.init({
    lng: 'en',
    resources: { en: { translation: en } },
    interpolation: { escapeValue: false },
  });
});
beforeEach(() => {
  jest.clearAllMocks();
  params = new URLSearchParams(
    'email=a%40qq.com&phone=%2B8613812345678&redirect=%2Fs%2Fshared&invite_code=ABCD'
  );
  localStorage.clear();
  originalApple = window.AppleID;
  Object.defineProperty(navigator, 'userAgent', {
    value: ua,
    configurable: true,
  });
  jest.mocked(isExternalMobileBrowser).mockReturnValue(false);
  captchaRun.mockImplementation((handler: (param: string) => unknown) =>
    handler('captcha-param')
  );
  jest.mocked(useCaptcha).mockReturnValue({
    running: false,
    run: captchaRun,
  } as unknown as ReturnType<typeof useCaptcha>);
  jest.mocked(http.post).mockImplementation(() => new Promise(() => {}));
  jest.mocked(http.get).mockImplementation(() => new Promise(() => {}));
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  window.AppleID = originalApple;
  Object.defineProperty(navigator, 'userAgent', { value: ua });
});

it.each([
  ['email', 'otp', 'auth/send-otp'],
  ['phone', 'otp', 'auth/send-phone-otp'],
  ['email', 'password', 'login'],
  ['phone', 'password', 'login'],
] as const)(
  'gates %s %s login before captcha or HTTP',
  async (contactMethod, authMethod, endpoint) => {
    await render(
      <LoginForm
        contactMethod={contactMethod}
        authMethod={authMethod}
        setAuthMethod={() => {}}
      >
        {null}
      </LoginForm>
    );
    if (authMethod === 'password')
      await act(async () => input('input[type="password"]', 'TestPass123'));
    await submit();
    expect(captchaRun).not.toHaveBeenCalled();
    expect(http.post).not.toHaveBeenCalled();
    await click(decline());
    expect(http.post).not.toHaveBeenCalled();
    await submit();
    await click(confirm());
    expect(http.post).toHaveBeenCalledTimes(1);
    expect(jest.mocked(http.post).mock.calls[0][0]).toBe(endpoint);
    expect(captchaRun).toHaveBeenCalledTimes(authMethod === 'otp' ? 1 : 0);
    if (authMethod === 'otp')
      expect(jest.mocked(http.post).mock.calls[0][1]).toEqual(
        expect.objectContaining({ captcha_verify_param: 'captcha-param' })
      );
  }
);
it.each([
  ['email', 'auth/send-signup-otp'],
  ['phone', 'auth/send-signup-phone-otp'],
] as const)(
  'gates %s registration and submits only after agreement',
  async (contactMethod, endpoint) => {
    await render(
      <RegisterForm contactMethod={contactMethod}>{null}</RegisterForm>
    );
    await submit();
    expect(captchaRun).not.toHaveBeenCalled();
    expect(http.post).not.toHaveBeenCalled();
    await click(confirm());
    expect(captchaRun).toHaveBeenCalledTimes(1);
    expect(jest.mocked(http.post).mock.calls[0][0]).toBe(endpoint);
  }
);
it('still validates current fields after confirming, rather than sending invalid input', async () => {
  params = new URLSearchParams();
  await render(
    <LoginForm contactMethod="email" authMethod="otp" setAuthMethod={() => {}}>
      {null}
    </LoginForm>
  );
  await submit();
  await click(confirm());
  expect(captchaRun).not.toHaveBeenCalled();
  expect(http.post).not.toHaveBeenCalled();
  expect(container.textContent).toContain(en.form.email_required);
});
it('gates Google before requesting its authorization URL and preserves the redirect', async () => {
  await render(<Google />);
  await click(container.querySelector('button:not([role="checkbox"])')!);
  expect(http.get).not.toHaveBeenCalled();
  await click(decline());
  expect(http.get).not.toHaveBeenCalled();
  await click(container.querySelector('button:not([role="checkbox"])')!);
  await click(confirm());
  expect(http.get).toHaveBeenCalledWith('/google/auth-url', {
    params: { redirect: '/s/shared' },
  });
});
it('gates desktop WeChat before mounting its QR sign-in', async () => {
  const onScan = jest.fn();
  await render(<WeChat onScan={onScan} />);
  await click(container.querySelector('button:not([role="checkbox"])')!);
  expect(onScan).not.toHaveBeenCalled();
  await click(confirm());
  expect(onScan).toHaveBeenCalledTimes(1);
  expect(onScan).toHaveBeenCalledWith(true);
});
it('gates WeChat in-app OAuth before fetching its URL', async () => {
  Object.defineProperty(navigator, 'userAgent', {
    value: 'MicroMessenger',
    configurable: true,
  });
  await render(<WeChat onScan={jest.fn()} />);
  await click(container.querySelector('button:not([role="checkbox"])')!);
  expect(http.get).not.toHaveBeenCalled();
  await click(confirm());
  expect(http.get).toHaveBeenCalledWith('/wechat/auth-url', {
    params: { redirect: '/s/shared' },
  });
});
it('gates external H5 WeChat before creating a session or launching the mini program', async () => {
  jest.mocked(isExternalMobileBrowser).mockReturnValue(true);
  jest
    .mocked(prepareH5WechatOAuthState)
    .mockResolvedValue({ state: 'state', deviceToken: 'device' } as Awaited<
      ReturnType<typeof prepareH5WechatOAuthState>
    >);
  await render(<WeChat onScan={jest.fn()} />);
  await click(container.querySelector('button:not([role="checkbox"])')!);
  expect(prepareH5WechatOAuthState).not.toHaveBeenCalled();
  expect(launchWechatMiniProgram).not.toHaveBeenCalled();
  await click(confirm());
  expect(prepareH5WechatOAuthState).toHaveBeenCalledWith('/s/shared');
  expect(launchWechatMiniProgram).toHaveBeenCalledWith(expect.any(Function), {
    redirect: '/s/shared',
    oauthState: 'state',
    oauthDeviceToken: 'device',
  });
});
it('starts preconfigured Apple sign-in synchronously from the consent click', async () => {
  let insideClick = false;
  const signIn = jest.fn(() => {
    expect(insideClick).toBe(true);
    return new Promise(() => {});
  });
  window.AppleID = { auth: { init: jest.fn(), signIn } };
  jest.mocked(http.get).mockResolvedValue({
    client_id: 'client',
    redirect_u_r_i: 'https://example.test/callback',
    state: 'state',
  });
  await render(<Apple />);
  expect(http.get).toHaveBeenCalledWith('/apple/auth-config');
  await click(container.querySelector('button:not([role="checkbox"])')!);
  expect(signIn).not.toHaveBeenCalled();
  const action = confirm();
  await act(async () => {
    insideClick = true;
    action.click();
    action.click();
    insideClick = false;
  });
  expect(signIn).toHaveBeenCalledTimes(1);
  expect(window.AppleID.auth.init).toHaveBeenCalledWith(
    expect.objectContaining({ clientId: 'client', usePopup: true })
  );
});
