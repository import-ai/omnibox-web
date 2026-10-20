import { useEffect, useMemo, useState } from 'react';

import useApp from '@/hooks/useApp';
import type { Member } from '@/interface';
import {
  NAMESPACE_MEMBERS_REFRESH,
  toMentionMembersById,
} from '@/page/resource/mentionCard';
import { mentionUsersFromMembers } from '@/page/resource/mentionUsers';

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
  if (current && (!refresh || current.refresh)) {
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

export function useCommentMentionUsers() {
  const namespaceId = useResourceCommentsPanel()?.namespaceId;
  const id =
    namespaceId && !namespaceId.startsWith('share:') ? namespaceId : '';
  const app = useApp();
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (!id) {
      setMembers([]);
      return;
    }
    let ignore = false;
    const listener: Listener = next => {
      if (!ignore) {
        setMembers(next);
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
    return app.on(NAMESPACE_MEMBERS_REFRESH, (nextId: string) => {
      if (nextId !== id) {
        return;
      }
      loadMembers(id, true).catch(() => undefined);
    });
  }, [app, id]);

  const users = useMemo(() => mentionUsersFromMembers(members), [members]);
  const membersById = useMemo(() => toMentionMembersById(members), [members]);
  return { users, membersById };
}
