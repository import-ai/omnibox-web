import { http } from '@/lib/request';

/**
 * Alibaba Cloud Captcha 2.0 (V3 architecture) browser integration helpers.
 *
 * The SDK is never bundled: it must be injected at runtime from Aliyun's CDN
 * after `window.AliyunCaptchaConfig` has been set. See
 * https://help.aliyun.com/zh/captcha/captcha2-0/user-guide/web-and-h5-client-access
 */

export const ALIYUN_CAPTCHA_SCRIPT_URL =
  'https://o.alicdn.com/captcha-frontend/aliyunCaptcha/AliyunCaptcha.js';

/**
 * CSS selector for the root nodes the SDK appends to `<body>` when it raises a
 * challenge (observed: `#aliyunCaptcha-window-popup`, `#aliyunCaptcha-mask`).
 * Mirrored by the `pointer-events` rule in `src/index.css`; keep both in sync.
 */
export const ALIYUN_CAPTCHA_NODE_SELECTOR =
  '[id*="aliyunCaptcha" i],[class*="aliyunCaptcha" i]';

/** True when `target` is inside an Aliyun captcha popup/mask. */
export function isInsideAliyunCaptcha(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest(ALIYUN_CAPTCHA_NODE_SELECTOR) !== null
  );
}

export type CaptchaScene = 'web' | 'app';
export type CaptchaMode = 'popup' | 'embed';
export type CaptchaLanguage = 'cn' | 'en' | 'tw';

export interface CaptchaConfig {
  enabled: boolean;
  prefix: string;
  region: string;
  scene_ids: Record<CaptchaScene, string>;
}

/** What `captchaVerifyCallback` must resolve for the SDK. */
export interface CaptchaVerifyResult {
  // false makes the SDK refresh the challenge so the user can retry.
  captchaResult: boolean;
  // Outcome of the business request the captcha param was attached to.
  bizResult?: boolean;
  // Server-side explanation of a rejection, surfaced once the hook stops
  // retrying. Never handed back to the SDK, which only reads the two flags.
  message?: string;
}

export interface AliyunCaptchaInstance {
  refresh?: () => void;
  [key: string]: unknown;
}

export interface AliyunCaptchaInitOptions {
  SceneId: string;
  mode: CaptchaMode;
  element: string;
  button?: string;
  captchaVerifyCallback: (
    captchaVerifyParam: string
  ) => Promise<CaptchaVerifyResult>;
  onBizResultCallback: (bizResult: boolean) => void;
  getInstance: (instance: AliyunCaptchaInstance) => void;
  slideStyle?: { width: number; height: number };
  language?: CaptchaLanguage;
  immediate?: boolean;
  timeout?: number;
}

declare global {
  interface Window {
    AliyunCaptchaConfig?: { region: string; prefix: string };
    initAliyunCaptcha?: (options: AliyunCaptchaInitOptions) => void;
    ReactNativeWebView?: { postMessage: (message: string) => void };
  }
}

let configPromise: Promise<CaptchaConfig> | null = null;

async function fetchCaptchaConfig(): Promise<CaptchaConfig> {
  const response = await http.get<CaptchaConfig>('/captcha/config', {
    mute: true,
  });
  return {
    enabled: Boolean(response?.enabled),
    prefix: response?.prefix ?? '',
    region: response?.region || 'cn',
    scene_ids: {
      web: response?.scene_ids?.web ?? '',
      app: response?.scene_ids?.app ?? '',
    },
  };
}

/**
 * Fetch the public captcha config. The promise is memoized so every hook
 * instance shares one request; one silent retry is attempted, and a final
 * failure clears the memo so the next caller tries again.
 */
export function loadCaptchaConfig(): Promise<CaptchaConfig> {
  if (!configPromise) {
    configPromise = fetchCaptchaConfig()
      .catch(() => fetchCaptchaConfig())
      .catch(error => {
        configPromise = null;
        throw error;
      });
  }
  return configPromise;
}

/** Test/HMR helper. */
export function clearCaptchaConfigCache() {
  configPromise = null;
}

let scriptPromise: Promise<void> | null = null;

/**
 * Inject the Aliyun captcha SDK once. `window.AliyunCaptchaConfig` must be set
 * before the script executes, so it is assigned before the tag is appended.
 */
export function ensureAliyunCaptchaScript(
  prefix: string,
  region = 'cn'
): Promise<void> {
  if (typeof window.initAliyunCaptcha === 'function') {
    return Promise.resolve();
  }
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      window.AliyunCaptchaConfig = { region, prefix };
      const script = document.createElement('script');
      script.src = ALIYUN_CAPTCHA_SCRIPT_URL;
      script.async = true;
      script.onload = () => {
        if (typeof window.initAliyunCaptcha === 'function') {
          resolve();
        } else {
          scriptPromise = null;
          reject(new Error('Aliyun captcha SDK did not initialize'));
        }
      };
      script.onerror = () => {
        scriptPromise = null;
        script.remove();
        reject(new Error('Failed to load Aliyun captcha SDK'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

/** Map an i18next language tag to the SDK's `language` option. */
export function toCaptchaLanguage(
  i18nLang: string | undefined
): CaptchaLanguage {
  return (i18nLang || '').toLowerCase().startsWith('zh') ? 'cn' : 'en';
}

/** Attach the captcha param to a request body only when one was produced. */
export function withCaptchaParam<T extends object>(
  body: T,
  captchaVerifyParam?: string
): T & { captcha_verify_param?: string } {
  return captchaVerifyParam
    ? { ...body, captcha_verify_param: captchaVerifyParam }
    : body;
}

/**
 * Translate a failed send request into the SDK result: a captcha rejection
 * (the backend answers 403) means the SDK should refresh the challenge;
 * anything else is a business failure with a valid captcha.
 *
 * The 403 is ambiguous: the backend's captcha guard returns the same
 * `403 captcha.errors.failed` for a challenge Aliyun rejected
 * and for its fail-closed `CREDENTIAL_ERROR` path (rotated AccessKey, missing
 * RAM policy), so a broken deployment cannot be told from a bad slide here.
 * `useCaptcha` therefore bounds how many consecutive rejections it refreshes
 * on. The one discriminator available without a backend change: an omnibox
 * application error carries a `code` in its body while the captcha guard's
 * bare `ForbiddenException` does not, so a coded 403 (an unrelated
 * `ForbiddenException` raised by the endpoint itself) is treated as a business
 * failure and never refreshes the challenge.
 */
export function captchaResultFromError(error: unknown): CaptchaVerifyResult {
  const response = (
    error as
      | {
          response?: {
            data?: { code?: unknown; message?: unknown };
            status?: number;
          };
        }
      | undefined
  )?.response;
  const message =
    typeof response?.data?.message === 'string' && response.data.message
      ? response.data.message
      : undefined;
  const hasErrorCode =
    typeof response?.data?.code === 'string' && response.data.code.length > 0;
  return response?.status === 403 && !hasErrorCode
    ? { captchaResult: false, bizResult: false, message }
    : { captchaResult: true, bizResult: false, message };
}
