/** @jest-environment jsdom */

import i18n from 'i18next';
import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { initReactI18next } from 'react-i18next';
import { TextDecoder, TextEncoder } from 'util';

import type { AliyunCaptchaInitOptions } from '@/lib/captcha';

class RequestPolyfill {
  url: string;
  method = 'GET';
  headers = { get: () => null };
  signal: AbortSignal;

  constructor(url: string, init: { signal: AbortSignal }) {
    this.url = url;
    this.signal = init.signal;
  }
}

Object.assign(globalThis, {
  TextDecoder,
  TextEncoder,
  Request: RequestPolyfill,
});

const mockLayoutMount = jest.fn();
const mockGet = jest.fn();

jest.mock('@/layout', () => ({
  __esModule: true,
  default: () => {
    mockLayoutMount();
    return null;
  },
}));
jest.mock('@/layout/ErrorPage', () => ({
  __esModule: true,
  default: () => <div>route error</div>,
}));
jest.mock('@/components/loading', () => ({
  __esModule: true,
  default: () => <div>loading</div>,
}));
jest.mock('@/hooks/app.class', () => ({
  __esModule: true,
  default: class {},
}));
jest.mock('@/page/chat', () => ({ __esModule: true, default: () => null }));
jest.mock('@/page/chat/ChatHomePage', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/page/namespace', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/page/localRuntime/runtime', () => ({
  CurrentDeviceContext: jest.requireActual('react').createContext(undefined),
}));
jest.mock('@/lib/request', () => ({
  http: { get: (...args: unknown[]) => mockGet(...args) },
}));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let sdkOptions: AliyunCaptchaInitOptions | undefined;
const postMessage = jest.fn();

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: 'en-US',
    fallbackLng: 'en-US',
    resources: {
      'en-US': {
        translation: {
          captcha: { loading: 'Loading captcha', unavailable: 'Unavailable' },
        },
      },
      'zh-CN': {
        translation: {
          captcha: { loading: '加载中', unavailable: '无法加载' },
        },
      },
    },
  });
});

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  sdkOptions = undefined;
  window.ReactNativeWebView = { postMessage };
  window.initAliyunCaptcha = options => {
    sdkOptions = options;
    options.getInstance({});
  };
  mockGet.mockImplementation(async (url: string) => {
    if (url !== '/captcha/config')
      throw new Error(`Unexpected request: ${url}`);
    return {
      enabled: true,
      prefix: 'test-prefix',
      region: 'cn',
      scene_ids: { web: 'web-scene', app: 'app-scene' },
    };
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  delete window.ReactNativeWebView;
  delete window.initAliyunCaptcha;
  const { clearCaptchaConfigCache } = await import('@/lib/captcha');
  clearCaptchaConfigCache();
});

async function openCaptcha(query: string, staleCredential = false) {
  window.history.replaceState({}, '', `/captcha?${query}`);
  await act(async () => {
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  if (staleCredential) {
    localStorage.setItem('uid', 'old-user');
    localStorage.setItem('token', 'expired-token');
  }
  const { default: App } = await import('@/App');
  await act(async () => {
    root.render(<App />);
  });
  // The actual lazy route, i18n update and captcha setup settle asynchronously.
  for (let attempt = 0; attempt < 20 && !sdkOptions; attempt += 1) {
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
  }
}

test.each([
  ['zh', 'light', false, 'cn', 'rgb(255, 255, 255)'],
  ['en', 'dark', true, 'en', 'rgb(28, 28, 30)'],
  ['en', 'light', false, 'en', 'rgb(255, 255, 255)'],
  ['zh', 'dark', true, 'cn', 'rgb(28, 28, 30)'],
])(
  'opens %s/%s without mounting authenticated layout (stale credentials: %s)',
  async (lang, theme, stale, sdkLanguage, background) => {
    await openCaptcha(`lang=${lang}&theme=${theme}`, stale as boolean);
    expect(sdkOptions).toMatchObject({
      SceneId: 'app-scene',
      mode: 'embed',
      immediate: true,
      language: sdkLanguage,
    });
    expect(mockLayoutMount).not.toHaveBeenCalled();
    expect(mockGet.mock.calls.map(call => call[0])).toEqual([
      '/captcha/config',
    ]);
    expect(window.location.pathname).toBe('/captcha');
    expect(
      container.querySelector<HTMLElement>('.fixed')?.style.background
    ).toBe(background);
    await act(async () => {
      await expect(
        sdkOptions!.captchaVerifyCallback('verified-param')
      ).resolves.toEqual({
        captchaResult: true,
        bizResult: true,
      });
    });
    expect(postMessage).toHaveBeenCalledWith(
      JSON.stringify({ type: 'captcha', captchaVerifyParam: 'verified-param' })
    );
  }
);

test('reports unavailable config through the existing App error message', async () => {
  mockGet.mockRejectedValue(new Error('config unavailable'));
  await openCaptcha('lang=zh&theme=dark');
  expect(postMessage).toHaveBeenCalledWith(
    JSON.stringify({ type: 'captcha_error', message: '无法加载' })
  );
  expect(window.location.pathname).toBe('/captcha');
  expect(mockLayoutMount).not.toHaveBeenCalled();
});

test('keeps login-method configuration available to the normal app layout', async () => {
  mockGet.mockResolvedValue({ available: true });
  window.history.replaceState({}, '', '/');
  const { default: App } = await import('@/App');
  await act(async () => {
    window.dispatchEvent(new PopStateEvent('popstate'));
    root.render(<App />);
  });
  expect(mockLayoutMount).toHaveBeenCalled();
  expect(mockGet.mock.calls.map(call => call[0])).toEqual([
    '/wechat/available',
    '/google/available',
    '/apple/available',
  ]);
});
