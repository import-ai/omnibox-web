import isMobile from 'ismobilejs';

import {
  WECHAT_H5_LAUNCH_FROM,
  WECHAT_MP_APPID,
  WECHAT_MP_INDEX_PATH,
} from '@/const';

export type WechatMpEnvVersion = 'release' | 'trial' | 'develop';

const LAUNCH_FAILURE_DELAY_MS = 2500;
const SCHEME_QUERY_MAX_LENGTH = 512;

export interface LaunchWechatMiniProgramOptions {
  redirect?: string | null;
  oauthState?: string | null;
  oauthDeviceToken?: string | null;
  envVersion?: WechatMpEnvVersion;
}

export function isExternalMobileBrowser(
  userAgent = navigator.userAgent
): boolean {
  const ua = userAgent.toLowerCase();
  return isMobile(ua).phone && !ua.includes('micromessenger');
}

function isAndroid(userAgent = navigator.userAgent): boolean {
  return /android/i.test(userAgent);
}

export function getWechatMpEnvVersion(): WechatMpEnvVersion {
  const env = import.meta.env.VITE_WECHAT_MP_ENV?.toLowerCase();
  if (env === 'trial' || env === 'develop') {
    return env;
  }
  return 'release';
}

function buildSchemePageQuery(
  redirect?: string | null,
  oauthState?: string | null,
  oauthDeviceToken?: string | null
): string {
  const parts = [`from=${WECHAT_H5_LAUNCH_FROM}`];

  if (oauthState) {
    parts.push(`oauth_state=${encodeURIComponent(oauthState)}`);
  }
  if (oauthDeviceToken) {
    parts.push(`oauth_device_token=${encodeURIComponent(oauthDeviceToken)}`);
  }

  if (redirect && redirect.length <= 200) {
    parts.push(`redirect=${encodeURIComponent(redirect)}`);
  }

  const pageQuery = parts.join('&');
  const encoded = encodeURIComponent(pageQuery);

  if (encoded.length > SCHEME_QUERY_MAX_LENGTH) {
    const fallback = oauthState
      ? [
          `from=${WECHAT_H5_LAUNCH_FROM}`,
          `oauth_state=${encodeURIComponent(oauthState)}`,
          ...(oauthDeviceToken
            ? [`oauth_device_token=${encodeURIComponent(oauthDeviceToken)}`]
            : []),
        ].join('&')
      : `from=${WECHAT_H5_LAUNCH_FROM}`;
    return encodeURIComponent(fallback);
  }

  return encoded;
}

/**
 * Build a plain WeChat mini program URL Scheme.
 * Path must keep literal slashes — URLSearchParams encodes "/" as "%2F"
 * which WeChat rejects with "当前页面无法访问".
 *
 * @see https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/url-scheme.html
 */
export function buildWechatMiniProgramScheme(
  options: LaunchWechatMiniProgramOptions = {}
): string {
  const envVersion = options.envVersion ?? getWechatMpEnvVersion();
  const schemeQuery = [
    `appid=${WECHAT_MP_APPID}`,
    `path=${WECHAT_MP_INDEX_PATH}`,
    `query=${buildSchemePageQuery(
      options.redirect,
      options.oauthState,
      options.oauthDeviceToken
    )}`,
  ];

  if (envVersion !== 'release') {
    schemeQuery.push(`env_version=${envVersion}`);
  }

  return `weixin://dl/business/?${schemeQuery.join('&')}`;
}

function openSchemeUrl(url: string): void {
  if (isAndroid()) {
    const link = document.createElement('a');
    link.href = url;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  window.location.href = url;
}

export function launchWechatMiniProgram(
  onLaunchFailed?: () => void,
  options: LaunchWechatMiniProgramOptions = {}
): void {
  const schemeUrl = buildWechatMiniProgramScheme(options);

  if (import.meta.env.DEV) {
    console.info('[wechat-mp] launch scheme:', schemeUrl);
  }

  openSchemeUrl(schemeUrl);

  if (!onLaunchFailed) {
    return;
  }

  window.setTimeout(() => {
    if (!document.hidden) {
      onLaunchFailed();
    }
  }, LAUNCH_FAILURE_DELAY_MS);
}
