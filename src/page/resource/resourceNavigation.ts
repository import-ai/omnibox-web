import type { NavigateFunction, NavigateOptions, To } from 'react-router-dom';

import { setWarmedResource } from './resourcePageCache';

type ResourceNavigateOptions = Omit<NavigateOptions, 'flushSync'>;

let warmGeneration = 0;

function pathFromTo(to: To) {
  if (typeof to === 'string') return to;
  return to.pathname || '';
}

const RESERVED_WORKSPACE_SEGMENTS = new Set(['chat', 'invite-referral']);

export function isReservedWorkspaceSegment(segment: string | undefined) {
  return Boolean(segment && RESERVED_WORKSPACE_SEGMENTS.has(segment));
}

export function isReservedWorkspacePath(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  return isReservedWorkspaceSegment(parts[1]);
}

function getNamespaceResourceTarget(to: To) {
  const parts = pathFromTo(to).split('/').filter(Boolean);
  if (parts.length < 2) return null;
  if (parts[0] === 's' || parts[0] === 'user') return null;
  if (isReservedWorkspaceSegment(parts[1])) return null;
  return { namespaceId: parts[0], resourceId: parts[1] };
}

function isChatPathname(pathname: string) {
  return /\/chat(?:\/|$)/.test(pathname);
}

function currentPathname() {
  return typeof window === 'undefined' ? '' : window.location.pathname;
}

function isCurrentResourceTarget(target: {
  namespaceId: string;
  resourceId: string;
}) {
  const current = getNamespaceResourceTarget(currentPathname());
  return (
    current?.namespaceId === target.namespaceId &&
    current?.resourceId === target.resourceId
  );
}

/** Leave chat immediately. Warming the next resource must not block or steal the URL. */
export function navigateToResource(
  navigate: NavigateFunction,
  to: To,
  options: ResourceNavigateOptions = {}
) {
  const target = getNamespaceResourceTarget(to);
  const startedFrom = currentPathname();
  const generation = ++warmGeneration;
  navigate(to, { ...options, flushSync: true });

  if (!target || !isChatPathname(startedFrom)) {
    return;
  }

  void (async () => {
    try {
      const { fetchResource } = await import('@/service/resource');
      const resource = await fetchResource(
        target.namespaceId,
        target.resourceId
      );
      if (generation !== warmGeneration) return;
      if (!isCurrentResourceTarget(target)) return;
      setWarmedResource(target.namespaceId, target.resourceId, resource);
    } catch {
      // The resource page fetches or shows its own error.
    }
  })();
}
