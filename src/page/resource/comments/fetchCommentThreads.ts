import type { ResourceCommentThread } from '@/interface';
import { listResourceCommentThreads } from '@/service/resourceComments';

import {
  matchesCommentView,
  mergeCommentThreads,
} from './documentCommentThreads';

export const COMMENT_REFRESH_PAGE_SIZE = 100;

export async function fetchAllResourceCommentThreads(
  namespaceId: string,
  resourceId: string,
  resolved: boolean | undefined,
  view: 'inline' | 'sidebar' | 'document' = 'sidebar'
) {
  const threads: ResourceCommentThread[] = [];
  let offset = 0;
  for (;;) {
    const page = await listResourceCommentThreads(namespaceId, resourceId, {
      offset,
      limit: COMMENT_REFRESH_PAGE_SIZE,
      resolved,
      view,
    });
    threads.push(...page.items);
    if (!page.has_more || page.items.length === 0) {
      return threads;
    }
    offset += page.items.length;
  }
}

// Replace only the threads in the active filter. A full refresh with no filter
// replaces every thread, so deletions show up. A resolved or unresolved
// refresh leaves the other group in place.
export function replaceThreadsForFilter(
  current: ResourceCommentThread[],
  incoming: ResourceCommentThread[],
  resolved: boolean | undefined
) {
  if (resolved === undefined) {
    return incoming;
  }
  const incomingIds = new Set(incoming.map(thread => thread.id));
  const kept = current.filter(
    thread => thread.resolved !== resolved && !incomingIds.has(thread.id)
  );
  return [...kept, ...incoming];
}

// Replace the sidebar view for this filter and keep threads that belong
// elsewhere, including unresolved full-document comments.
export function replaceSidebarThreads(
  current: ResourceCommentThread[],
  incoming: ResourceCommentThread[],
  resolved: boolean | undefined
) {
  const incomingIds = new Set(incoming.map(thread => thread.id));
  const kept = current.filter(
    thread =>
      !matchesCommentView(thread, 'sidebar', resolved) &&
      !incomingIds.has(thread.id)
  );
  return mergeCommentThreads(kept, incoming, true);
}
