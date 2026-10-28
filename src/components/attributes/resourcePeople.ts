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
