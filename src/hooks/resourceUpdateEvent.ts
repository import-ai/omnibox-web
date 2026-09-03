import type { Resource } from '@/interface';

export const RESOURCE_CONTENT_UPDATE_EVENTS = [
  'update_resource',
  'refresh_resource',
] as const;

export function getResourceEventId(
  delta: Resource | string
): string | undefined {
  if (typeof delta === 'string') {
    return delta || undefined;
  }
  return delta?.id;
}

/** Copilot/agent operations fire these events with a resource id, not a body. */
export function shouldRefetchResourceContent(
  delta: Resource | string,
  resourceId: string,
  allowRefetch = true
): boolean {
  return (
    allowRefetch &&
    Boolean(resourceId) &&
    typeof delta === 'string' &&
    delta === resourceId
  );
}

export function isCurrentResourceDeleted(
  deletedId: string | undefined,
  resourceId: string
): boolean {
  return Boolean(deletedId && resourceId && deletedId === resourceId);
}

export function isNotFoundResourceError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === 'object' &&
    'response' in error &&
    (error as { response?: { status?: number } }).response?.status === 404
  );
}

export function isForbiddenResourceError(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('response' in error)) {
    return false;
  }
  const response = (
    error as {
      response?: { status?: number; data?: { code?: string } };
    }
  ).response;
  return (
    response?.status === 403 ||
    response?.data?.code?.toLowerCase() === 'not_authorized'
  );
}

export function applyResourceUpdateDelta(
  resource: Resource,
  delta: Resource,
  resourceId: string
): Resource {
  const isCurrentResource = delta.id === resourceId;
  const isInPath = resource.path?.some(item => item.id === delta.id);

  if (!isCurrentResource && !isInPath) {
    return resource;
  }

  const updatedPath =
    isCurrentResource && delta.path !== undefined
      ? delta.path
      : delta.name !== undefined
        ? resource.path?.map(item =>
            item.id === delta.id ? { ...item, name: delta.name || '' } : item
          )
        : resource.path;

  return {
    ...resource,
    ...(isCurrentResource && {
      ...(delta.name !== undefined && { name: delta.name }),
      ...(delta.content !== undefined && { content: delta.content }),
      ...(delta.tags !== undefined && { tags: delta.tags }),
      ...(delta.attrs !== undefined && { attrs: delta.attrs }),
      ...(delta.parent_id !== undefined && { parent_id: delta.parent_id }),
      ...(delta.space_type !== undefined && {
        space_type: delta.space_type,
      }),
      ...(delta.updated_at !== undefined && {
        updated_at: delta.updated_at,
      }),
    }),
    path: updatedPath,
  };
}
