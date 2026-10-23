import { useCallback, useEffect, useRef, useState } from 'react';

import type { ResourceCommentThread } from '@/interface';
import { listResourceCommentThreads } from '@/service/resourceComments';

import {
  compareCommentThreads,
  matchesCommentView,
  mergeCommentThreads,
} from './documentCommentThreads';

const PAGE_SIZE = 20;
const emptyPage = () => ({
  items: [] as ResourceCommentThread[],
  total: 0,
  offset: 0,
  hasMore: false,
  cursorEnd: null as ResourceCommentThread | null,
});

export function useCommentThreadCollection({
  namespaceId,
  resourceId,
  enabled,
  view,
  resolved,
  onThreads,
}: {
  namespaceId: string;
  resourceId: string;
  enabled: boolean;
  view: 'sidebar' | 'document';
  resolved: boolean | undefined;
  onThreads: (threads: ResourceCommentThread[]) => void;
}) {
  const [page, setPage] = useState(emptyPage);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageRef = useRef(page);
  pageRef.current = page;
  const scope = `${namespaceId}:${resourceId}:${view}:${resolved}`;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const requestRef = useRef(0);
  const mutationVersionRef = useRef(0);
  const localRevisionRef = useRef(0);
  const localThreadsRef = useRef(
    new Map<string, { thread: ResourceCommentThread; revision: number }>()
  );
  const resolvedRef = useRef(resolved);
  resolvedRef.current = resolved;

  const load = useCallback(
    async function loadPage(append = false): Promise<void> {
      const request = ++requestRef.current;
      const mutationVersion = mutationVersionRef.current;
      const localRevision = localRevisionRef.current;
      append ? setLoadingMore(true) : setLoading(true);
      try {
        const response = await listResourceCommentThreads(
          namespaceId,
          resourceId,
          {
            view,
            resolved,
            offset: append ? pageRef.current.offset : 0,
            limit: PAGE_SIZE,
          }
        );
        if (scopeRef.current !== scope || request !== requestRef.current)
          return;
        if (mutationVersionRef.current !== mutationVersion) {
          // A response queried before a mutation has an obsolete total and cursor.
          await loadPage();
          return;
        }
        response.items.forEach(thread => {
          const local = localThreadsRef.current.get(thread.id);
          // A fresh page supersedes snapshots injected before this request began.
          if (local && local.revision <= localRevision)
            localThreadsRef.current.delete(thread.id);
        });
        const incoming = mergeCommentThreads(
          response.items,
          [...localThreadsRef.current.values()].map(local => local.thread),
          view === 'sidebar'
        );
        onThreads(incoming);
        setPage(current => ({
          items: mergeCommentThreads(
            append ? current.items : [],
            incoming,
            view === 'sidebar'
          ).filter(thread => matchesCommentView(thread, view, resolved)),
          total: response.total,
          // Local creations and permalink targets never advance the server cursor.
          offset: response.offset + response.items.length,
          hasMore: response.has_more,
          cursorEnd:
            response.items[response.items.length - 1] ??
            (append ? current.cursorEnd : null),
        }));
      } finally {
        if (scopeRef.current === scope && request === requestRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [namespaceId, resourceId, view, resolved, scope, onThreads]
  );

  useEffect(() => {
    requestRef.current += 1;
    localThreadsRef.current.clear();
    setPage(emptyPage());
    setLoading(false);
    setLoadingMore(false);
    if (enabled) void load().catch(() => undefined);
    return () => {
      requestRef.current += 1;
    };
  }, [enabled, load]);

  const put = useCallback(
    (
      thread: ResourceCommentThread,
      previous?: ResourceCommentThread,
      created = false
    ) => {
      localThreadsRef.current.set(thread.id, {
        thread,
        revision: ++localRevisionRef.current,
      });
      if (created || (previous && previous !== thread))
        mutationVersionRef.current += 1;
      setPage(current => {
        const matches = matchesCommentView(thread, view, resolvedRef.current);
        const wasMember = previous
          ? matchesCommentView(previous, view, resolvedRef.current)
          : false;
        const delta = previous
          ? Number(matches) - Number(wasMember)
          : created
            ? Number(matches)
            : 0;
        // Membership changes before the last server row shift offset pagination.
        // A freshly injected target or newly created comment never moves this cursor.
        const cursorDelta =
          previous &&
          current.cursorEnd &&
          compareCommentThreads(
            previous,
            current.cursorEnd,
            view === 'sidebar'
          ) <= 0
            ? delta
            : 0;
        return {
          ...current,
          items: matches
            ? mergeCommentThreads(current.items, [thread], view === 'sidebar')
            : current.items.filter(item => item.id !== thread.id),
          total: Math.max(0, current.total + delta),
          offset: Math.max(0, current.offset + cursorDelta),
        };
      });
    },
    [view]
  );

  const remove = useCallback(
    (threadId: string, previous?: ResourceCommentThread) => {
      localThreadsRef.current.delete(threadId);
      mutationVersionRef.current += 1;
      setPage(current => {
        const delta = Number(
          !!previous && matchesCommentView(previous, view, resolvedRef.current)
        );
        const cursorDelta =
          previous &&
          current.cursorEnd &&
          compareCommentThreads(
            previous,
            current.cursorEnd,
            view === 'sidebar'
          ) <= 0
            ? delta
            : 0;
        return {
          ...current,
          items: current.items.filter(thread => thread.id !== threadId),
          total: Math.max(0, current.total - delta),
          offset: Math.max(0, current.offset - cursorDelta),
        };
      });
    },
    [view]
  );

  return {
    threads: page.items,
    total: page.total,
    hasMore: page.hasMore,
    loading,
    loadingMore,
    load,
    put,
    remove,
  };
}
