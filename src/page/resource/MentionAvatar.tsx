// The document @ menu uses a black disc when a member has no photo.
export const MENTION_AVATAR_COLOR = '#000000';

export function MentionAvatar({ initial }: { initial: string }) {
  return (
    <span
      className="tiptap-avatar"
      data-size="default"
      style={{ ['--dynamic-user-color' as string]: MENTION_AVATAR_COLOR }}
      aria-hidden="true"
    >
      <span className="tiptap-avatar-item">
        <span className="tiptap-avatar-fallback">{initial}</span>
      </span>
    </span>
  );
}
