import isMobile from 'ismobilejs';

import { WECHAT_MP_APPID, WECHAT_MP_INDEX_PATH } from '@/const';

export type WechatMpEnvVersion = 'release' | 'trial' | 'develop';

const LAUNCH_FAILURE_DELAY_MS = 2500;

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

/**
 * Build a plain WeChat mini program URL Scheme.
 * Path must keep literal slashes — URLSearchParams encodes "/" as "%2F"
 * which WeChat rejects with "当前页面无法访问".
 *
 * @see https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/url-scheme.html
 */
export function buildWechatMiniProgramScheme(
  envVersion: WechatMpEnvVersion = getWechatMpEnvVersion()
): string {
  const query = [`appid=${WECHAT_MP_APPID}`, `path=${WECHAT_MP_INDEX_PATH}`];

  if (envVersion !== 'release') {
    query.push(`env_version=${envVersion}`);
  }

  return `weixin://dl/business/?${query.join('&')}`;
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
  envVersion: WechatMpEnvVersion = getWechatMpEnvVersion()
): void {
  const schemeUrl = buildWechatMiniProgramScheme(envVersion);

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
