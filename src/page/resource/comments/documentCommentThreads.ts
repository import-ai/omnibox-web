import type {
  ResourceCommentThread,
  ResourceDocumentCommentThread,
  ResourceInlineCommentThread,
} from '@/interface';

export function isDocumentCommentThread(
  thread: ResourceCommentThread
): thread is ResourceDocumentCommentThread {
  return thread.type === 'document';
}

export function isInlineCommentThread(
  thread: ResourceCommentThread
): thread is ResourceInlineCommentThread {
  return thread.type !== 'document' && thread.anchor !== null;
}

export function matchesCommentView(
  thread: ResourceCommentThread,
  view: 'sidebar' | 'document',
  resolved: boolean | undefined
) {
  const inView =
    view === 'document'
      ? isDocumentCommentThread(thread)
      : isInlineCommentThread(thread) || thread.resolved;
  return inView && (resolved === undefined || thread.resolved === resolved);
}

export function mergeCommentThreads(
  current: ResourceCommentThread[],
  incoming: ResourceCommentThread[],
  sidebar = false
) {
  const byId = new Map(current.map(thread => [thread.id, thread]));
  incoming.forEach(thread => byId.set(thread.id, thread));
  return [...byId.values()].sort((left, right) =>
    compareCommentThreads(left, right, sidebar)
  );
}

export function compareCommentThreads(
  left: ResourceCommentThread,
  right: ResourceCommentThread,
  sidebar = false
) {
  return (
    (sidebar
      ? Number(isDocumentCommentThread(left)) -
        Number(isDocumentCommentThread(right))
      : 0) ||
    Date.parse(left.created_at) - Date.parse(right.created_at) ||
    left.id.localeCompare(right.id)
  );
}
