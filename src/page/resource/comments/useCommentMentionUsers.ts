import { useEffect, useMemo, useState } from 'react';

import type { Member } from '@/interface';
import { toMentionMembersById } from '@/page/resource/mentionCard';
import { mentionUsersFromMembers } from '@/page/resource/mentionUsers';

import { useResourceCommentsPanel } from './ResourceCommentsContext';

// ponytail: coalesce one in-flight members request per namespace. Do not keep
// the member list; nicknames and membership must refresh on the next mount.
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

  const users = useMemo(() => mentionUsersFromMembers(members), [members]);
  const membersById = useMemo(() => toMentionMembersById(members), [members]);
  return { users, membersById };
}
