export const CONTRIBUTOR_LABEL_MAX_LENGTH = 16;

export function truncateContributorLabel(
  label: string,
  maxLength = CONTRIBUTOR_LABEL_MAX_LENGTH
) {
  const characters = Array.from(label);
  if (characters.length <= maxLength) {
    return label;
  }
  return `${characters.slice(0, maxLength).join('')}…`;
}

export function liveContributorLabel(
  label: string,
  member?: {
    id?: string;
    username?: string | null;
    nickname?: string | null;
    email?: string | null;
  } | null
) {
  if (!member) {
    return label;
  }
  const identity =
    member.username?.trim() || member.email?.trim() || member.id || '';
  const nickname = member.nickname?.trim() || '';
  if (nickname && identity && nickname !== identity) {
    return `${nickname}（${identity}）`;
  }
  return nickname || identity || label;
}

export function contributorInitial(label: string) {
  return Array.from(label)[0]?.toLocaleUpperCase() || '?';
}
