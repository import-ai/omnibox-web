const FALLBACK_AUTH_REDIRECT = '/';
const NON_NAMESPACE_EXACT_PATHS = new Set(['/', '/welcome']);
const NON_NAMESPACE_PATH_PREFIXES = ['/s/', '/user/', '/oauth/', '/invite/'];

function decodeRedirect(redirect: string): string {
  try {
    return decodeURIComponent(redirect);
  } catch {
    return redirect;
  }
}

function isNamespaceScopedPath(pathname: string): boolean {
  if (NON_NAMESPACE_EXACT_PATHS.has(pathname)) {
    return false;
  }

  return !NON_NAMESPACE_PATH_PREFIXES.some(prefix =>
    pathname.startsWith(prefix)
  );
}

export function getAuthSuccessRedirect(
  redirect: string | null,
  origin = window.location.origin
): string {
  if (!redirect) {
    return FALLBACK_AUTH_REDIRECT;
  }

  try {
    const url = new URL(decodeRedirect(redirect).trim(), origin);
    if (url.origin !== origin || isNamespaceScopedPath(url.pathname)) {
      return FALLBACK_AUTH_REDIRECT;
    }

    return `${url.pathname}${url.search}${url.hash}` || FALLBACK_AUTH_REDIRECT;
  } catch {
    return FALLBACK_AUTH_REDIRECT;
  }
}
