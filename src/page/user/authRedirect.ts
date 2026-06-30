const FALLBACK_AUTH_REDIRECT = '/';
const NON_NAMESPACE_EXACT_PATHS = new Set(['/', '/welcome']);
const NON_NAMESPACE_PATH_PREFIXES = ['/s/', '/user/', '/oauth/', '/invite/'];

interface AuthRedirectOptions {
  origin?: string;
  namespaceAccessResolver?: (namespaceId: string) => Promise<boolean>;
}

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

function getRedirectPath(url: URL): string {
  return `${url.pathname}${url.search}${url.hash}` || FALLBACK_AUTH_REDIRECT;
}

function getNamespaceId(pathname: string): string | null {
  if (!isNamespaceScopedPath(pathname)) {
    return null;
  }

  return pathname.split('/').filter(Boolean)[0] || null;
}

function resolveOptions(
  originOrOptions?: string | AuthRedirectOptions
): Required<Pick<AuthRedirectOptions, 'origin'>> & AuthRedirectOptions {
  if (typeof originOrOptions === 'string') {
    return { origin: originOrOptions };
  }

  const defaultOrigin =
    typeof window === 'undefined'
      ? FALLBACK_AUTH_REDIRECT
      : window.location.origin;

  return {
    origin: defaultOrigin,
    ...originOrOptions,
  };
}

async function hasNamespaceAccess(namespaceId: string): Promise<boolean> {
  try {
    const { http } = await import('@/lib/request');
    const namespaces = await http.get('namespaces', { mute: true });
    return (
      Array.isArray(namespaces) &&
      namespaces.some(namespace => namespace?.id === namespaceId)
    );
  } catch {
    return false;
  }
}

export async function getAuthSuccessRedirect(
  redirect: string | null,
  originOrOptions?: string | AuthRedirectOptions
): Promise<string> {
  if (!redirect) {
    return FALLBACK_AUTH_REDIRECT;
  }

  try {
    const { origin, namespaceAccessResolver } = resolveOptions(originOrOptions);
    const url = new URL(decodeRedirect(redirect).trim(), origin);
    if (url.origin !== origin) {
      return FALLBACK_AUTH_REDIRECT;
    }

    const namespaceId = getNamespaceId(url.pathname);
    if (!namespaceId) {
      return getRedirectPath(url);
    }

    const canAccessNamespace = namespaceAccessResolver || hasNamespaceAccess;
    return (await canAccessNamespace(namespaceId))
      ? getRedirectPath(url)
      : FALLBACK_AUTH_REDIRECT;
  } catch {
    return FALLBACK_AUTH_REDIRECT;
  }
}
