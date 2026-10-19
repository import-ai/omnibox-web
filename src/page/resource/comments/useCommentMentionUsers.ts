import type { OmniboxEditorMentionUser } from '@import-ai/omnibox-editor';
import { useEffect, useState } from 'react';

import type { Member } from '@/interface';
import { mentionUsersFromMembers } from '@/page/resource/mentionUsers';

import { useResourceCommentsPanel } from './ResourceCommentsContext';

const cache = new Map<string, OmniboxEditorMentionUser[]>();
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
    .then(members => {
      const users = mentionUsersFromMembers(
        Array.isArray(members) ? members : []
      );
      cache.set(namespaceId, users);
      return users;
    })
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
  const [users, setUsers] = useState<OmniboxEditorMentionUser[]>(
    () => cache.get(id) ?? []
  );

  useEffect(() => {
    if (!id) {
      setUsers([]);
      return;
    }
    const cached = cache.get(id);
    if (cached) {
      setUsers(cached);
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
