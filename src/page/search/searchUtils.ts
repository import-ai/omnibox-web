import type {
  ResourceCondition,
  ResourceConditionMatchMode,
} from '../resource/conditions';
import {
  getConditionLimitMessage,
  isResourceConditionComplete,
  toResourceConditionApiPayload,
} from '../resource/conditions/resourceConditionUtils';
import { getMarkdownDownloadContent } from '../resource/downloadMarkdown';

const SEARCH_PREVIEW_LIMIT = 120;
const BASIC_SEARCH_CONDITION_LIMIT = 3;
export const SEARCH_PAGE_SIZE = 20;

/**
 * Pull plain text out of Tiptap JSON that may be incomplete (API summary
 * truncation often cuts mid-attrs, before any "text" field).
 */
export function extractTextFromPossiblyTruncatedTiptapJson(content: string) {
  const trimmed = content.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return '';
  }

  // Complete JSON → proper markdown (keeps # / ** like online).
  try {
    const parsed = JSON.parse(trimmed);
    if (
      parsed &&
      typeof parsed === 'object' &&
      (parsed as { type?: string }).type === 'doc'
    ) {
      return getMarkdownDownloadContent(trimmed).trim();
    }
  } catch {
    // Truncated — fall through.
  }

  // Incomplete JSON: harvest every "text":"..." field that made it through.
  const texts: string[] = [];
  const textField = /"text"\s*:\s*"((?:\\.|[^"\\])*)"/g;
  let match: RegExpExecArray | null;
  while ((match = textField.exec(trimmed)) !== null) {
    try {
      texts.push(JSON.parse(`"${match[1]}"`) as string);
    } catch {
      texts.push(match[1]);
    }
  }

  return texts.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Search/recent list preview — online shows markdown truncated.
 * Saved Tiptap JSON is converted to markdown first.
 */
export function toSearchPreviewText(content?: string) {
  const raw = content?.trim() ?? '';
  if (!raw) {
    return '';
  }

  // Tiptap JSON (full or truncated).
  if (raw.startsWith('{') || raw.startsWith('[')) {
    const fromJson = extractTextFromPossiblyTruncatedTiptapJson(raw);
    if (fromJson) {
      return fromJson;
    }
    // Still looks like editor JSON but no recoverable text — hide structure.
    if (
      /"type"\s*:\s*"doc"/.test(raw) ||
      /"type"\s*:\s*"paragraph"/.test(raw)
    ) {
      return '';
    }
  }

  // Legacy markdown / plain text.
  return getMarkdownDownloadContent(raw).trim();
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
