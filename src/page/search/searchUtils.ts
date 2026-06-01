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

export function shouldShowSearchNoResults(
  showRecents: boolean,
  resourceCount: number,
  messageCount: number
) {
  return !showRecents && resourceCount === 0 && messageCount === 0;
}

export function buildSearchRequestPayload(
  query: string,
  conditions: ResourceCondition[],
  matchMode: ResourceConditionMatchMode
) {
  const payload = toResourceConditionApiPayload({
    matchMode,
    conditions: getCompleteSearchConditions(conditions),
  });

  return {
    query: query.trim(),
    ...payload,
  };
}
