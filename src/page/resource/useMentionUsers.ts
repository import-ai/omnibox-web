import type { OmniboxEditorMentionUser } from '@import-ai/omnibox-editor';
import { useEffect, useMemo, useState } from 'react';

import type { Member } from '@/interface';
import { http } from '@/lib/request';
import {
  memberDisplayName,
  memberMentionSubtext,
} from '@/page/settings/tabs/members/memberDisplay';

function toMentionUsers(members: Member[]): OmniboxEditorMentionUser[] {
  return members.reduce<OmniboxEditorMentionUser[]>((users, member) => {
    const id = member.user_id;
    const name = memberDisplayName(member);
    if (!id || !name) {
      return users;
    }

    users.push({
      id,
      name,
      position: memberMentionSubtext(member),
    });
    return users;
  }, []);
}

export function useMentionUsers(namespaceId?: string) {
  const [mentionUsers, setMentionUsers] = useState<OmniboxEditorMentionUser[]>(
    []
  );
  const [ready, setReady] = useState(!namespaceId);

  useEffect(() => {
    if (!namespaceId) {
      setMentionUsers([]);
      setReady(true);
      return;
    }
    const namespace: string = namespaceId;

    let ignore = false;
    setReady(false);

    async function loadMentionUsers() {
      try {
        const members = await http.get<Member[]>(
          `/namespaces/${namespace}/members`,
          { mute: true }
        );
        if (ignore) {
          return;
        }

        setMentionUsers(toMentionUsers(Array.isArray(members) ? members : []));
      } catch {
        if (!ignore) {
          setMentionUsers([]);
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

  const namesById = useMemo(
    () => Object.fromEntries(mentionUsers.map(user => [user.id, user.name])),
    [mentionUsers]
  );

  return { mentionUsers, namesById, ready };
}
