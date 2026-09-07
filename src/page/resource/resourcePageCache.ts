import type { Resource } from '@/interface';

let warmed: { key: string; resource: Resource } | null = null;

function cacheKey(namespaceId: string, resourceId: string) {
  return `${namespaceId}:${resourceId}`;
}

export function setWarmedResource(
  namespaceId: string,
  resourceId: string,
  resource: Resource
) {
  warmed = { key: cacheKey(namespaceId, resourceId), resource };
}

export function getWarmedResource(namespaceId: string, resourceId: string) {
  if (!namespaceId || !resourceId) return null;
  if (warmed?.key !== cacheKey(namespaceId, resourceId)) return null;
  return warmed.resource;
}

export function clearWarmedResource() {
  warmed = null;
}
