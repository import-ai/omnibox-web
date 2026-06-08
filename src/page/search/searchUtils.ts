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

export function buildSearchPreview(content?: string) {
  const normalized = content?.trim() ?? '';

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
  pagination: { limit?: number; offset?: number } = {}
) {
  const payload = toResourceConditionApiPayload({
    matchMode,
    conditions: getCompleteSearchConditions(conditions),
  });

  return {
    query: query.trim(),
    offset: pagination.offset ?? 0,
    limit: pagination.limit ?? SEARCH_PAGE_SIZE,
    ...payload,
  };
}
