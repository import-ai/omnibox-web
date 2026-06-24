const AUTH_STORAGE_KEYS = new Set(['uid', 'token']);
const PUBLIC_AUTH_PATH_PREFIXES = [
  '/s/',
  '/user/login',
  '/user/sign-up',
  '/user/verify-otp',
  '/user/accept-invite',
  '/user/account/delete/confirm',
  '/user/auth/confirm',
  '/oauth/authorize',
  '/invite/',
];

export function isAuthStorageKey(key: string | null): boolean {
  return Boolean(key && AUTH_STORAGE_KEYS.has(key));
}

export function getAuthChangeRedirectPath(
  pathname: string,
  previousUid: string | null,
  nextUid: string | null
): string | undefined {
  if (PUBLIC_AUTH_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
    return undefined;
  }
  return previousUid && !nextUid ? '/user/login' : undefined;
}
