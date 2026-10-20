import { createContext, useContext } from 'react';

// Undefined uses the browser origin; null records an unavailable host origin.
export const PublicSiteOriginContext = createContext<string | null | undefined>(
  undefined
);

export function usePublicSiteOrigin(): string | null {
  const hostOrigin = useContext(PublicSiteOriginContext);
  const candidate = hostOrigin === undefined ? location.origin : hostOrigin;
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}
