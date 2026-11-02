import { useEffect, useMemo, useState } from 'react';

import useApp from '@/hooks/useApp';
import { USER_UPDATED_EVENT } from '@/hooks/userEvents';
import type { Member } from '@/interface';
import { http } from '@/lib/request';
import {
  NAMESPACE_MEMBERS_REFRESH,
  toMentionMembersById,
} from '@/page/resource/mentionCard';
import {
  mentionNameMap,
  mentionUsersFromMembers,
} from '@/page/resource/mentionUsers';

export function useMentionUsers(namespaceId?: string) {
  const app = useApp();
  const [members, setMembers] = useState<Member[]>([]);
  const [ready, setReady] = useState(!namespaceId);

  useEffect(() => {
    if (!namespaceId || namespaceId.startsWith('share:')) {
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
        .then(loadedMembers => {
          if (ignore || current !== ticket) {
            return;
          }
          setMembers(Array.isArray(loadedMembers) ? loadedMembers : []);
        })
        .catch(() => {
          // A failed refresh must keep the list already on screen.
        })
        .finally(() => {
          if (!ignore && current === ticket) {
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

    const refresh = () => load(false);
    window.addEventListener(USER_UPDATED_EVENT, refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener(USER_UPDATED_EVENT, refresh);
      window.removeEventListener('focus', refresh);
      ignore = true;
      unsubscribe();
    };
  }, [app, namespaceId]);

  const mentionUsers = useMemo(
    () => mentionUsersFromMembers(members),
    [members]
  );
  const membersById = useMemo(() => toMentionMembersById(members), [members]);
  const namesById = useMemo(() => mentionNameMap(members), [members]);
  return { mentionUsers, membersById, namesById, ready };
}
