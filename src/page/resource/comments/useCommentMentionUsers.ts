import { useEffect, useMemo, useState } from 'react';

import useApp from '@/hooks/useApp';
import type { Member } from '@/interface';
import {
  NAMESPACE_MEMBERS_REFRESH,
  toMentionMembersById,
} from '@/page/resource/mentionCard';
import { mentionUsersFromMembers } from '@/page/resource/mentionUsers';

import { useResourceCommentsPanel } from './ResourceCommentsContext';

// ponytail: coalesce one in-flight members request per namespace. Do not keep
// the list across mounts. A profile save asks open documents to load again.
const pending = new Map<string, Promise<Member[]>>();

function loadMembers(namespaceId: string) {
  const current = pending.get(namespaceId);
  if (current) {
    return current;
  }
  const task = import('@/lib/request')
    .then(({ http }) =>
      Promise.resolve(
        http.get<Member[]>(`/namespaces/${namespaceId}/members`, { mute: true })
      )
    )
    .then(members => (Array.isArray(members) ? members : []))
    .finally(() => {
      pending.delete(namespaceId);
    });
  pending.set(namespaceId, task);
  return task;
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
    loadMembers(id)
      .then(next => {
        if (!ignore) {
          setMembers(next);
        }
      })
      .catch(() => {
        if (!ignore) {
          setMembers([]);
        }
      });
    return () => {
      ignore = true;
    };
  }, [id]);

  useEffect(() => {
    if (!id) {
      return;
    }
    let ignore = false;
    const unsubscribe = app.on(NAMESPACE_MEMBERS_REFRESH, (nextId: string) => {
      if (nextId !== id) {
        return;
      }
      loadMembers(id)
        .then(next => {
          if (!ignore) {
            setMembers(next);
          }
        })
        .catch(() => {
          if (!ignore) {
            setMembers([]);
          }
        });
    });
    return () => {
      ignore = true;
      unsubscribe();
    };
  }, [app, id]);

  const users = useMemo(() => mentionUsersFromMembers(members), [members]);
  const membersById = useMemo(() => toMentionMembersById(members), [members]);
  return { users, membersById };
}
