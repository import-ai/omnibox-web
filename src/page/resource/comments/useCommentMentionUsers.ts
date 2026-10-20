import type { OmniboxEditorMentionUser } from '@import-ai/omnibox-editor';
import { useEffect, useState } from 'react';

import type { Member } from '@/interface';
import { mentionUsersFromMembers } from '@/page/resource/mentionUsers';

import { useResourceCommentsPanel } from './ResourceCommentsContext';

const LAST_SEEN_KEY = 'omnibox.comment-mention-names';

// ponytail: coalesce one in-flight members request per namespace. Do not keep
// the member list; nicknames and membership must refresh on the next mount.
const pending = new Map<string, Promise<OmniboxEditorMentionUser[]>>();

function readLastSeenNames(): Record<string, string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(LAST_SEEN_KEY) || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string'
      )
    );
  } catch {
    return {};
  }
}

export function rememberMentionNames(users: { id: string; name: string }[]) {
  const stored = readLastSeenNames();
  let changed = false;
  for (const user of users) {
    if (!user.id || !user.name || stored[user.id] === user.name) {
      continue;
    }
    stored[user.id] = user.name;
    changed = true;
  }
  if (!changed) {
    return;
  }
  try {
    localStorage.setItem(LAST_SEEN_KEY, JSON.stringify(stored));
  } catch {
    // Ignore quota and private-mode failures. The shortcode label still shows.
  }
}

export function frozenMentionName(id: string) {
  return readLastSeenNames()[id];
}

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
      rememberMentionNames(users);
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
