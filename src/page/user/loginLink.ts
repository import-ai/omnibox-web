export const PRICING_PATH = '/zh-cn/pricing';

/** Only a same-origin path, never another host. */
export function safeRedirect(redirect: unknown): string {
  return typeof redirect === 'string' &&
    redirect.startsWith('/') &&
    !redirect.startsWith('//')
    ? redirect
    : PRICING_PATH;
}

/** Reads the one-time code from the hash and removes it from the address bar. */
export function takeLoginLinkCode(): string | null {
  const code = new URLSearchParams(window.location.hash.replace(/^#/, '')).get(
    'code'
  );
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${window.location.search}`
  );
  return code;
}

export function leaveTo(url: string) {
  window.location.replace(url);
}
