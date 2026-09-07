import type { NavigateFunction, NavigateOptions, To } from 'react-router-dom';

import { setWarmedResource } from './resourcePageCache';

type ResourceNavigateOptions = Omit<NavigateOptions, 'flushSync'>;

let warmGeneration = 0;

function pathFromTo(to: To) {
  if (typeof to === 'string') return to;
  return to.pathname || '';
}

function getNamespaceResourceTarget(to: To) {
  const parts = pathFromTo(to).split('/').filter(Boolean);
  if (parts.length < 2) return null;
  if (parts[0] === 's' || parts[0] === 'user') return null;
  if (parts[1] === 'chat') return null;
  return { namespaceId: parts[0], resourceId: parts[1] };
}

function isChatPathname(pathname: string) {
  return /\/chat(?:\/|$)/.test(pathname);
}

function currentPathname() {
  return typeof window === 'undefined' ? '' : window.location.pathname;
}

function canCommitWarm(generation: number, startedFrom: string) {
  return generation === warmGeneration && currentPathname() === startedFrom;
}

/** From chat, wait for the resource so the next screen paints with content. */
export function navigateToResource(
  navigate: NavigateFunction,
  to: To,
  options: ResourceNavigateOptions = {}
) {
  const target = getNamespaceResourceTarget(to);
  const startedFrom = currentPathname();
  if (target && isChatPathname(startedFrom)) {
    const generation = ++warmGeneration;
    void (async () => {
      try {
        const { fetchResource } = await import('@/service/resource');
        const resource = await fetchResource(
          target.namespaceId,
          target.resourceId
        );
        if (!canCommitWarm(generation, startedFrom)) return;
        setWarmedResource(target.namespaceId, target.resourceId, resource);
      } catch {
        // Still leave chat; the resource page will fetch or show its own error.
      }
      if (!canCommitWarm(generation, startedFrom)) return;
      navigate(to, { ...options, flushSync: true });
    })();
    return;
  }

  // Chat/history and resource↔resource: bump immediately so a pending warm
  // cannot commit after React Router delays history.push for a lazy route.
  warmGeneration += 1;
  navigate(to, { ...options, flushSync: true });
}
