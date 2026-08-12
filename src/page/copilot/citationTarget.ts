const resourceIdPattern = /^[0-9A-Za-z]{16}$/;
const externalProtocolPattern = /^[a-z][a-z\d+.-]*:/i;
const allowedExternalProtocols = new Set(['http:', 'https:']);

export type CitationTarget =
  | { kind: 'resource'; resourceId: string }
  | { kind: 'external'; href: string }
  | { kind: 'unavailable' };

function matchResourceId(value: string) {
  return resourceIdPattern.test(value) ? value : null;
}

function resolveRelativeResource(link: string, namespaceId: string) {
  const direct = matchResourceId(link.replace(/^(?:\.\.\/|#)/, ''));
  if (direct) return direct;

  const path = link.split(/[?#]/, 1)[0].replace(/^\/+|\/+$/g, '');
  const segments = path.split('/');
  if (segments.length !== 2 || segments[0] !== namespaceId) return null;
  return matchResourceId(segments[1]);
}

export type ResolveCitationTargetOptions = {
  currentOrigin?: string;
};

function resolveCurrentOrigin(options?: ResolveCitationTargetOptions) {
  if (options?.currentOrigin) return options.currentOrigin;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
}

/** Classifies a citation link without navigating or mutating browser state. */
export function resolveCitationTarget(
  link: string,
  namespaceId: string,
  options?: ResolveCitationTargetOptions
): CitationTarget {
  const trimmedLink = link.trim();
  if (!trimmedLink) return { kind: 'unavailable' };

  if (!externalProtocolPattern.test(trimmedLink)) {
    const resourceId = resolveRelativeResource(trimmedLink, namespaceId);
    if (resourceId) return { kind: 'resource', resourceId };
    return { kind: 'external', href: trimmedLink };
  }

  try {
    const url = new URL(trimmedLink);
    if (!allowedExternalProtocols.has(url.protocol)) {
      return { kind: 'unavailable' };
    }
    const currentOrigin = resolveCurrentOrigin(options);
    const path = url.pathname.replace(/^\/+|\/+$/g, '');
    const segments = path.split('/');
    if (
      currentOrigin &&
      url.origin === currentOrigin &&
      segments.length === 2 &&
      segments[0] === namespaceId
    ) {
      const resourceId = matchResourceId(segments[1]);
      if (resourceId) return { kind: 'resource', resourceId };
    }
    return { kind: 'external', href: trimmedLink };
  } catch {
    return { kind: 'unavailable' };
  }
}
