import type { Member } from '@/interface';

export const MEMBER_NICKNAME_MAX_LENGTH = 64;
export const MEMBER_NOTE_MAX_LENGTH = 128;

export function memberDisplayName(
  member: Pick<Member, 'nickname' | 'username' | 'email' | 'user_id'>
) {
  const identity = member.username || member.email || member.user_id || '';
  const nickname = member.nickname?.trim() || '';
  if (nickname && identity && nickname !== identity) {
    return `${nickname}（${identity}）`;
  }
  return nickname || identity;
}

export function memberMentionSubtext(
  member: Pick<Member, 'note' | 'email' | 'role'>
) {
  const parts = [member.note, member.email].filter((value): value is string =>
    Boolean(value && value.trim())
  );
  if (parts.length) {
    return parts.join(' ');
  }
  return member.role || undefined;
}
