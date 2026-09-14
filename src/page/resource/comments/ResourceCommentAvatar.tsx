export function ResourceCommentAvatar({
  author,
  id,
}: {
  author?: string | null;
  id?: string | null;
}) {
  const label = author?.trim() || '?';
  return (
    <span
      className="omnibox-comment-avatar"
      data-tone={getAvatarTone(id || label)}
      aria-hidden="true"
    >
      {Array.from(label)[0]?.toLocaleUpperCase() || '?'}
    </span>
  );
}

function getAvatarTone(value: string) {
  let hash = 0;
  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }
  return String(Math.abs(hash) % 4);
}
