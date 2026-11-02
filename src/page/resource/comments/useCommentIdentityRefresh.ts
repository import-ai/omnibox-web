import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { USER_UPDATED_EVENT } from '@/hooks/useUser';
import type { ResourceCommentAuthor, ResourceCommentThread } from '@/interface';
import { getResourceCommentThread } from '@/service/resourceComments';

interface ThreadIdentity {
  creator: ResourceCommentAuthor;
  authors: Map<string, ResourceCommentAuthor>;
  names?: Record<string, string>;
  version: number;
}

const EMPTY_NAMES: Record<string, string> = {};

export function useCommentIdentityRefresh({
  namespaceId,
  resourceId,
  enabled,
  threads,
  localVersions,
  memberNamesKey,
}: {
  namespaceId: string;
  resourceId: string;
  enabled: boolean;
  threads: ResourceCommentThread[];
  localVersions: RefObject<Map<string, number>>;
  memberNamesKey: string;
}) {
  const key = `${namespaceId}:${resourceId}`;
  const threadsRef = useRef(threads);
  threadsRef.current = threads;
  const refreshRef = useRef<(() => void) | null>(null);
  const requestedScope = useRef<string | null>(null);
  const [identities, setIdentities] = useState({
    key,
    names: EMPTY_NAMES,
    threads: new Map<string, ThreadIdentity>(),
  });
  const threadIdsKey = threads
    .map(thread => thread.id)
    .sort()
    .join(',');
  const previous = useRef({ key, memberNamesKey, threadIdsKey });

  useEffect(() => {
    requestedScope.current = null;
    if (!enabled) return;
    let disposed = false;
    let ticket = 0;
    let running = false;
    const path = namespaceId.startsWith('share:')
      ? `/shares/${namespaceId.slice(6)}/resources/${resourceId}`
      : `/namespaces/${namespaceId}/resources/${resourceId}`;

    const run = async () => {
      running = true;
      try {
        let current: number;
        do {
          current = ticket;
          const isCurrent = () => !disposed && current === ticket;
          const snapshots = threadsRef.current.map(thread => ({
            id: thread.id,
            version: localVersions.current.get(thread.id) ?? 0,
          }));
          const refreshed = new Map<string, ThreadIdentity>();
          let index = 0;
          const worker = async () => {
            while (isCurrent() && index < snapshots.length) {
              const snapshot = snapshots[index++];
              try {
                const thread = await getResourceCommentThread(
                  namespaceId,
                  resourceId,
                  snapshot.id
                );
                refreshed.set(snapshot.id, {
                  creator: thread.creator,
                  authors: new Map(
                    thread.comments.map(comment => [comment.id, comment.author])
                  ),
                  names: thread.mention_display_names,
                  version: snapshot.version,
                });
              } catch {
                // A failed identity lookup must not remove a card or its draft.
              }
            }
          };
          const [resource] = await Promise.all([
            import('@/lib/request')
              .then(({ http }) =>
                http.get<{ mention_display_names?: Record<string, string> }>(
                  path,
                  { mute: true }
                )
              )
              .catch(() => null),
            Promise.all(
              Array.from({ length: Math.min(4, snapshots.length) }, worker)
            ),
          ]);
          if (!isCurrent()) continue;
          setIdentities(previous => {
            if (!isCurrent()) return previous;
            const loadedIds = new Set(
              threadsRef.current.map(thread => thread.id)
            );
            const updated = new Map(
              previous.key === key
                ? [...previous.threads].filter(([id]) => loadedIds.has(id))
                : []
            );
            for (const [id, identity] of refreshed) {
              if (
                (localVersions.current.get(id) ?? 0) === identity.version &&
                loadedIds.has(id)
              ) {
                updated.set(id, identity);
              }
            }
            return {
              key,
              names: resource
                ? (resource.mention_display_names ?? EMPTY_NAMES)
                : previous.key === key
                  ? previous.names
                  : EMPTY_NAMES,
              threads: updated,
            };
          });
        } while (!disposed && current !== ticket);
      } finally {
        running = false;
      }
    };
    const refresh = () => {
      ticket += 1;
      requestedScope.current = key;
      // Finish in-flight requests before starting the newest invalidation.
      if (!running) void run();
    };
    refreshRef.current = refresh;
    window.addEventListener(USER_UPDATED_EVENT, refresh);
    window.addEventListener('focus', refresh);
    return () => {
      disposed = true;
      refreshRef.current = null;
      window.removeEventListener(USER_UPDATED_EVENT, refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [enabled, key, namespaceId, resourceId, localVersions]);

  useEffect(() => {
    const before = previous.current;
    previous.current = { key, memberNamesKey, threadIdsKey };
    if (
      before.key === key &&
      (before.memberNamesKey !== memberNamesKey ||
        (before.threadIdsKey !== threadIdsKey &&
          requestedScope.current === key))
    ) {
      refreshRef.current?.();
    }
  }, [key, memberNamesKey, threadIdsKey]);

  const withIdentity = useCallback(
    (thread: ResourceCommentThread) => {
      const identity =
        identities.key === key ? identities.threads.get(thread.id) : undefined;
      if (
        !identity ||
        identity.version !== (localVersions.current.get(thread.id) ?? 0)
      )
        return thread;
      const author = (
        current: ResourceCommentAuthor,
        next?: ResourceCommentAuthor
      ) =>
        next && (next.id === current.id || next.id === null)
          ? {
              ...current,
              username: next.username,
              display_name: next.display_name,
            }
          : current;
      // Only identity fields are projected; remote contents and membership stay untouched.
      return {
        ...thread,
        mention_display_names: identity.names ?? thread.mention_display_names,
        creator: author(thread.creator, identity.creator),
        comments: thread.comments.map(comment => ({
          ...comment,
          author: author(comment.author, identity.authors.get(comment.id)),
        })),
      };
    },
    [identities, key, localVersions]
  );

  return {
    names: identities.key === key ? identities.names : EMPTY_NAMES,
    withIdentity,
  };
}
