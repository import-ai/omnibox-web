export type ConversationLoadPhase = 'hydrate' | 'refresh';

const INVALIDATING_REFRESH_STATUSES = new Set([401, 403, 404, 410]);

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const directStatus = Reflect.get(error, 'status');
  if (typeof directStatus === 'number') return directStatus;
  const response = Reflect.get(error, 'response');
  if (!response || typeof response !== 'object') return undefined;
  const responseStatus = Reflect.get(response, 'status');
  return typeof responseStatus === 'number' ? responseStatus : undefined;
}

/** Detect the 401 path that clears credentials before feature-level handlers run. */
export function isConversationAuthenticationFailure(error: unknown) {
  return getErrorStatus(error) === 401;
}

interface VisibleConversationFailureContext {
  currentUserId: string;
  destroyed: boolean;
  error: unknown;
  requestUserId: string;
}

/** Allow UI cleanup only for the active identity or its credential-clearing 401. */
export function shouldClearVisibleConversation({
  currentUserId,
  destroyed,
  error,
  requestUserId,
}: VisibleConversationFailureContext) {
  if (destroyed) return false;
  if (currentUserId === requestUserId) return true;
  return !currentUserId && isConversationAuthenticationFailure(error);
}

/** Decide whether a failed load invalidates previously rendered conversation data. */
export function shouldInvalidateConversation(
  phase: ConversationLoadPhase,
  error: unknown
) {
  if (phase === 'hydrate') return true;
  const status = getErrorStatus(error);
  return status !== undefined && INVALIDATING_REFRESH_STATUSES.has(status);
}
