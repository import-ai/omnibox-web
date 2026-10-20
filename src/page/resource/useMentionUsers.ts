import { useEffect, useMemo, useState } from 'react';

import useApp from '@/hooks/useApp';
import type { Member } from '@/interface';
import { http } from '@/lib/request';
import {
  NAMESPACE_MEMBERS_REFRESH,
  toMentionMembersById,
} from '@/page/resource/mentionCard';
import { mentionUsersFromMembers } from '@/page/resource/mentionUsers';

export function useMentionUsers(namespaceId?: string) {
  const app = useApp();
  const [members, setMembers] = useState<Member[]>([]);
  const [ready, setReady] = useState(!namespaceId);

  useEffect(() => {
    if (!namespaceId) {
      setMembers([]);
      setReady(true);
      return;
    }
    let ignore = false;

    let ticket = 0;
    const load = (initial: boolean) => {
      const current = ++ticket;
      if (initial) {
        setReady(false);
      }
      http
        .get<Member[]>(`/namespaces/${namespaceId}/members`, { mute: true })
        .then(loaded => {
          if (ignore || current !== ticket) {
            return;
          }
          setMembers(Array.isArray(loaded) ? loaded : []);
        })
        .catch(() => {
          // A failed refresh must keep the list already on screen.
        })
        .finally(() => {
          if (!ignore && initial && current === ticket) {
            setReady(true);
          }
        });
    };

    load(true);
    const unsubscribe = app.on(NAMESPACE_MEMBERS_REFRESH, (nextId: string) => {
      if (nextId === namespaceId) {
        load(false);
      }
    });

    return () => {
      ignore = true;
      unsubscribe();
    };
  }, [app, namespaceId]);

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
