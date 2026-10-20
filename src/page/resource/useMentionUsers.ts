import { useEffect, useMemo, useState } from 'react';

import type { Member } from '@/interface';
import { http } from '@/lib/request';
import { toMentionMembersById } from '@/page/resource/mentionCard';
import { mentionUsersFromMembers } from '@/page/resource/mentionUsers';

export function useMentionUsers(namespaceId?: string) {
  const [members, setMembers] = useState<Member[]>([]);
  const [ready, setReady] = useState(!namespaceId);

  useEffect(() => {
    if (!namespaceId) {
      setMembers([]);
      setReady(true);
      return;
    }
    const namespace: string = namespaceId;

    let ignore = false;
    setReady(false);

    async function loadMentionUsers() {
      try {
        const loaded = await http.get<Member[]>(
          `/namespaces/${namespace}/members`,
          { mute: true }
        );
        if (ignore) {
          return;
        }

        setMembers(Array.isArray(loaded) ? loaded : []);
      } catch {
        if (!ignore) {
          setMembers([]);
        }
      } finally {
        if (!ignore) {
          setReady(true);
        }
      }
    }

    loadMentionUsers();

    return () => {
      ignore = true;
    };
  }, [namespaceId]);

  const mentionUsers = useMemo(
    () => mentionUsersFromMembers(members),
    [members]
  );
  const membersById = useMemo(() => toMentionMembersById(members), [members]);
  const namesById = useMemo(
    () => Object.fromEntries(mentionUsers.map(user => [user.id, user.name])),
    [mentionUsers]
  );

  return { mentionUsers, membersById, namesById, ready };
}
