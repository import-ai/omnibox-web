import type { OmniboxEditorMentionUser } from '@import-ai/omnibox-editor';

import type { Member } from '@/interface';
import {
  memberDisplayName,
  memberMentionSubtext,
} from '@/page/settings/tabs/members/memberDisplay';

export function mentionUsersFromMembers(
  members: Member[]
): OmniboxEditorMentionUser[] {
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

export function mentionNameMap(members: Member[]) {
  return Object.fromEntries(
    mentionUsersFromMembers(members).map(user => [user.id, user.name])
  );
}
