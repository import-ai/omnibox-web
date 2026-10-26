export const PRICING_PATH = '/zh-cn/pricing';
export const OAUTH_STATE_KEY = 'wechat_oa_login_state';

export type LoginLinkFailure =
  'not_wechat' | 'not_bound' | 'not_owner' | 'failed';

export interface OAuthCallback {
  code: string;
  state: string;
  /** Whether `state` is the one this tab saved before leaving for WeChat. */
  valid: boolean;
}

/** Only a same-origin path, never another host. */
export function safeRedirect(redirect: unknown): string {
  return typeof redirect === 'string' &&
    redirect.startsWith('/') &&
    !redirect.startsWith('//')
    ? redirect
    : PRICING_PATH;
}

export function isWechatBrowser(userAgent: string): boolean {
  return /MicroMessenger/i.test(userAgent);
}

export function saveOAuthState(state: string) {
  try {
    window.sessionStorage.setItem(OAUTH_STATE_KEY, state);
  } catch {
    // Without storage the callback cannot match and shows the failure.
  }
}

function takeSavedOAuthState(): string | null {
  try {
    const saved = window.sessionStorage.getItem(OAUTH_STATE_KEY);
    window.sessionStorage.removeItem(OAUTH_STATE_KEY);
    return saved;
  } catch {
    return null;
  }
}

/**
 * Reads the `?code=&state=` WeChat redirects back with, removes them from the
 * address bar and drops the saved state, so a callback is handled once.
 * Returns null on a first open, which still has to go to WeChat.
 */
export function takeOAuthCallback(): OAuthCallback | null {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('code') && !params.has('state')) return null;
  const code = params.get('code') ?? '';
  const state = params.get('state') ?? '';
  params.delete('code');
  params.delete('state');
  const search = params.toString();
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${search ? `?${search}` : ''}`
  );
  const saved = takeSavedOAuthState();
  return { code, state, valid: !!code && !!state && saved === state };
}

export function failureKind(error: unknown): LoginLinkFailure {
  const code = (error as { response?: { data?: { code?: unknown } } })?.response
    ?.data?.code;
  switch (typeof code === 'string' ? code.toLowerCase() : '') {
    case 'wechat_oa_not_bound':
      return 'not_bound';
    case 'wechat_oa_not_owner':
      return 'not_owner';
    default:
      return 'failed';
  }
}

export function leaveTo(url: string) {
  window.location.replace(url);
}
