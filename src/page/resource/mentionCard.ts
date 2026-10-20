export type MentionCardMember = {
  id: string;
  username?: string | null;
  nickname?: string | null;
  email?: string | null;
  note?: string | null;
};

export type MentionCardField = 'nickname' | 'username' | 'email' | 'note';

export type MentionCardRow = {
  field: MentionCardField;
  value: string;
};

function trimmed(value?: string | null) {
  return value?.trim() || '';
}

export function mentionCardRows(member: MentionCardMember): MentionCardRow[] {
  // ponytail: members API has no phone or photo; letter mark stands in until it does
  const fields: Array<[MentionCardField, string]> = [
    ['nickname', trimmed(member.nickname)],
    ['username', trimmed(member.username)],
    ['email', trimmed(member.email)],
    ['note', trimmed(member.note)],
  ];
  return fields
    .filter((entry): entry is [MentionCardField, string] => Boolean(entry[1]))
    .map(([field, value]) => ({ field, value }));
}

export function mentionCardInitial(member: MentionCardMember) {
  const source =
    trimmed(member.nickname) ||
    trimmed(member.username) ||
    trimmed(member.email) ||
    '?';
  return Array.from(source)[0]?.toLocaleUpperCase() || '?';
}

export function toMentionMembersById(
  members: Array<{
    user_id?: string | null;
    username?: string | null;
    nickname?: string | null;
    email?: string | null;
    note?: string | null;
  }>
) {
  const membersById: Record<string, MentionCardMember> = {};
  for (const member of members) {
    const id = member.user_id?.trim();
    if (!id) {
      continue;
    }
    membersById[id] = {
      id,
      username: member.username,
      nickname: member.nickname,
      email: member.email,
      note: member.note,
    };
  }
  return membersById;
}
