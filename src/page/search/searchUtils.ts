import type { AxiosError } from 'axios';

import type {
  ResourceCondition,
  ResourceConditionMatchMode,
} from '../resource/conditions';
import {
  getConditionLimitMessage,
  isResourceConditionComplete,
  toResourceConditionApiPayload,
} from '../resource/conditions/resourceConditionUtils';

const SEARCH_PREVIEW_LIMIT = 120;
const BASIC_SEARCH_CONDITION_LIMIT = 3;
export const SEARCH_PAGE_SIZE = 20;
export const SEARCH_PENDING_RETRIES = 3;
export const SEARCH_PENDING_RETRY_DELAY_MS = 500;

export type SearchNotice = 'pending' | 'failed';

/** V1 search answers an empty page with work remaining as search_pending. */
export function isSearchPendingError(error: unknown) {
  return getSearchErrorCode(error) === 'search_pending';
}

/** The relevance judge exhausted its attempts; the session cannot continue. */
export function isSearchJudgmentFailedError(error: unknown) {
  return getSearchErrorCode(error) === 'search_judgment_failed';
}

function getSearchErrorCode(error: unknown) {
  const code = (error as AxiosError<{ code?: string }>)?.response?.data?.code;

  return typeof code === 'string' ? code.toLowerCase() : '';
}

/** The V2 wire protocol identifies a session and continuation explicitly. */
export function createSearchRequestId() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Retries an unfinished (search_pending) page a bounded number of times. Each
 * retry resumes the session cursor, so the page eventually fills or the search
 * is proven exhausted; anything else is reported immediately.
 */
export async function retrySearchPending<T>(
  request: () => Promise<T>,
  options: {
    retries?: number;
    delayMs?: number;
    isCancelled?: () => boolean;
  } = {}
): Promise<T> {
  const retries = options.retries ?? SEARCH_PENDING_RETRIES;
  const delayMs = options.delayMs ?? SEARCH_PENDING_RETRY_DELAY_MS;
  const isCancelled = options.isCancelled ?? (() => false);

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      if (attempt >= retries || !isSearchPendingError(error) || isCancelled()) {
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

/** Search/recent list preview — content is persisted markdown. */
export function toSearchPreviewText(content?: string) {
  return content?.trim() ?? '';
}

export function buildSearchPreview(content?: string) {
  const normalized = toSearchPreviewText(content);

  if (!normalized) {
    return '';
  }

  if (normalized.length <= SEARCH_PREVIEW_LIMIT) {
    return normalized;
  }

  return `${normalized.slice(0, SEARCH_PREVIEW_LIMIT)}...`;
}

export function getSearchConditionLimitMessageKey(maxConditionCount: number) {
  return getConditionLimitMessage(
    maxConditionCount > BASIC_SEARCH_CONDITION_LIMIT ? 'premium' : 'basic'
  );
}

export function getCompleteSearchConditions(conditions: ResourceCondition[]) {
  return conditions.filter(isResourceConditionComplete);
}

export function shouldRunSearchRequest(
  query: string,
  conditions: ResourceCondition[]
) {
  return !!query.trim() || getCompleteSearchConditions(conditions).length > 0;
}

export function shouldRefreshSearchRequest(
  open: boolean,
  query: string,
  conditions: ResourceCondition[]
) {
  return open && shouldRunSearchRequest(query, conditions);
}

export function shouldShowSearchNoResults(
  showRecents: boolean,
  resourceCount: number,
  messageCount: number,
  loadingInitial = false
) {
  return (
    !loadingInitial && !showRecents && resourceCount === 0 && messageCount === 0
  );
}

export function shouldShowSearchLoading(
  shouldSearch: boolean,
  loadingInitial: boolean,
  itemCount: number
) {
  return shouldSearch && loadingInitial && itemCount === 0;
}

export function shouldShowRecentResourcesLoading(
  showRecents: boolean,
  loadingRecents: boolean,
  recentCount: number
) {
  return showRecents && loadingRecents && recentCount === 0;
}

export function shouldShowRecentResourcesEmpty(
  showRecents: boolean,
  loadingRecents: boolean,
  recentCount: number
) {
  return showRecents && !loadingRecents && recentCount === 0;
}

export function buildSearchRequestPayload(
  query: string,
  conditions: ResourceCondition[],
  matchMode: ResourceConditionMatchMode,
  pagination: {
    limit?: number;
    offset?: number;
    paginationVersion?: number;
    requestId?: string;
    searchId?: string;
  } = {}
) {
  const payload = toResourceConditionApiPayload({
    matchMode,
    conditions: getCompleteSearchConditions(conditions),
  });

  const request = {
    query: query.trim(),
    offset: pagination.offset ?? 0,
    limit: pagination.limit ?? SEARCH_PAGE_SIZE,
    ...payload,
  };

  if (pagination.paginationVersion !== 2) {
    return request;
  }

  return {
    ...request,
    pagination_version: 2,
    request_id: pagination.requestId,
    ...(pagination.searchId ? { search_id: pagination.searchId } : {}),
  };
}
