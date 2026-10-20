export type MentionCardMember = {
  id: string;
  username?: string | null;
  nickname?: string | null;
  email?: string | null;
  phone?: string | null;
  note?: string | null;
  avatar?: string | null;
};

export type MentionCardField =
  'nickname' | 'username' | 'email' | 'phone' | 'note';

export type MentionCardRow = {
  field: MentionCardField;
  value: string;
};

function trimmed(value?: string | null) {
  return value?.trim() || '';
}

export function mentionCardRows(member: MentionCardMember): MentionCardRow[] {
  const fields: Array<[MentionCardField, string]> = [
    ['nickname', trimmed(member.nickname)],
    ['username', trimmed(member.username)],
    ['email', trimmed(member.email)],
    ['phone', trimmed(member.phone)],
    ['note', trimmed(member.note)],
  ];
  return fields
    .filter((entry): entry is [MentionCardField, string] => Boolean(entry[1]))
    .map(([field, value]) => ({ field, value }));
}

export function hasMentionCard(member: MentionCardMember) {
  return Boolean(trimmed(member.avatar)) || mentionCardRows(member).length > 0;
}

export function mentionCardInitial(member: MentionCardMember) {
  const source =
    trimmed(member.nickname) ||
    trimmed(member.username) ||
    trimmed(member.email) ||
    trimmed(member.phone) ||
    '?';
  return Array.from(source)[0]?.toLocaleUpperCase() || '?';
}

export function toMentionMembersById(
  members: Array<{
    user_id?: string | null;
    username?: string | null;
    nickname?: string | null;
    email?: string | null;
    phone?: string | null;
    note?: string | null;
    avatar?: string | null;
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
      phone: member.phone,
      note: member.note,
      avatar: member.avatar,
    };
  }
  return membersById;
}
