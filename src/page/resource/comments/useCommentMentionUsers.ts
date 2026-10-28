import { useEffect, useMemo, useState } from 'react';

import useApp from '@/hooks/useApp';
import { USER_UPDATED_EVENT } from '@/hooks/userEvents';
import type { Member } from '@/interface';
import {
  NAMESPACE_MEMBERS_REFRESH,
  toMentionMembersById,
} from '@/page/resource/mentionCard';
import {
  mentionNameMap,
  mentionUsersFromMembers,
} from '@/page/resource/mentionUsers';

import { useResourceCommentsPanel } from './ResourceCommentsContext';

type Listener = (members: Member[]) => void;

type Inflight = {
  ticket: number;
  promise: Promise<Member[] | null>;
  refresh: boolean;
};

// One load per namespace. Each comment input subscribes; a newer refresh
// drops the older response instead of leaving every input but the last empty.
const generation = new Map<string, number>();
const inflight = new Map<string, Inflight>();
const listeners = new Map<string, Set<Listener>>();

function loadMembers(namespaceId: string, refresh = false) {
  const current = inflight.get(namespaceId);
  if (current && !refresh) {
    return current.promise;
  }
  const ticket = (generation.get(namespaceId) ?? 0) + 1;
  generation.set(namespaceId, ticket);
  const promise = import('@/lib/request')
    .then(({ http }) =>
      Promise.resolve(
        http.get<Member[]>(`/namespaces/${namespaceId}/members`, { mute: true })
      )
    )
    .then(members => {
      if (generation.get(namespaceId) !== ticket) {
        return null;
      }
      const next = Array.isArray(members) ? members : [];
      listeners.get(namespaceId)?.forEach(listener => listener(next));
      return next;
    })
    .finally(() => {
      if (inflight.get(namespaceId)?.ticket === ticket) {
        inflight.delete(namespaceId);
      }
    });
  inflight.set(namespaceId, { ticket, promise, refresh });
  return promise;
}

const pendingRefreshes = new Map<string, Promise<Member[] | null>>();
function refreshMembers(namespaceId: string) {
  const pending = pendingRefreshes.get(namespaceId);
  if (pending) return pending;
  const promise = Promise.resolve().then(() => {
    pendingRefreshes.delete(namespaceId);
    return loadMembers(namespaceId, true);
  });
  pendingRefreshes.set(namespaceId, promise);
  return promise;
}

export function useCommentMentionUsers() {
  const namespaceId = useResourceCommentsPanel()?.namespaceId;
  const id =
    namespaceId && !namespaceId.startsWith('share:') ? namespaceId : '';
  const app = useApp();
  const [members, setMembers] = useState<Member[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!id) {
      setMembers([]);
      setLoaded(false);
      return;
    }
    setLoaded(false);
    let ignore = false;
    const listener: Listener = next => {
      if (!ignore) {
        setMembers(next);
        setLoaded(true);
      }
    };
    const group = listeners.get(id) ?? new Set<Listener>();
    group.add(listener);
    listeners.set(id, group);
    loadMembers(id).catch(() => undefined);
    return () => {
      ignore = true;
      group.delete(listener);
      if (group.size === 0) {
        listeners.delete(id);
      }
    };
  }, [id]);

  useEffect(() => {
    if (!id) {
      return;
    }
    const unsubscribe = app.on(NAMESPACE_MEMBERS_REFRESH, (nextId: string) => {
      if (nextId !== id) {
        return;
      }
      refreshMembers(id).catch(() => undefined);
    });
    const refresh = () => {
      void refreshMembers(id).catch(() => undefined);
    };
    window.addEventListener(USER_UPDATED_EVENT, refresh);
    window.addEventListener('focus', refresh);
    return () => {
      unsubscribe();
      window.removeEventListener(USER_UPDATED_EVENT, refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [app, id]);

  const users = useMemo(() => mentionUsersFromMembers(members), [members]);
  const namesById = useMemo(() => mentionNameMap(members), [members]);
  const membersById = useMemo(() => toMentionMembersById(members), [members]);
  return { users, membersById, namesById, loaded };
}
