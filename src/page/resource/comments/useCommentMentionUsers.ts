import type { OmniboxEditorMentionUser } from '@import-ai/omnibox-editor';
import { useEffect, useState } from 'react';

import type { Member } from '@/interface';
import { mentionUsersFromMembers } from '@/page/resource/mentionUsers';

import { useResourceCommentsPanel } from './ResourceCommentsContext';

// ponytail: coalesce one in-flight members request per namespace. Do not keep
// the member list; nicknames and membership must refresh on the next mount.
const pending = new Map<string, Promise<OmniboxEditorMentionUser[]>>();

function loadMentionUsers(namespaceId: string) {
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
    .then(members =>
      mentionUsersFromMembers(Array.isArray(members) ? members : [])
    )
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
  const [users, setUsers] = useState<OmniboxEditorMentionUser[]>([]);

  useEffect(() => {
    if (!id) {
      setUsers([]);
      return;
    }
    let ignore = false;
    loadMentionUsers(id)
      .then(next => {
        if (!ignore) {
          setUsers(next);
        }
      })
      .catch(() => {
        if (!ignore) {
          setUsers([]);
        }
      });
    return () => {
      ignore = true;
    };
  }, [id]);

  return users;
}
