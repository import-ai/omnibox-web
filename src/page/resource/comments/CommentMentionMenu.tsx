import { createPortal } from 'react-dom';

import type { CommentMentionUser } from './commentMentions';
import { mentionMenuPlacement } from './commentMentions';

export type CommentMentionMenuSpec = {
  anchor: HTMLTextAreaElement | null;
  label: string;
  matches: CommentMentionUser[];
  selected: number;
  onPick: (user: CommentMentionUser) => void;
};

export function CommentMentionMenu({
  spec,
}: {
  spec: CommentMentionMenuSpec | null;
}) {
  const rect = spec?.anchor?.getBoundingClientRect();
  if (!spec || !rect || typeof document === 'undefined') {
    return null;
  }
  const placement = mentionMenuPlacement(rect, {
    width: window.innerWidth,
    height: window.innerHeight,
  });
  return createPortal(
    <ul
      role="listbox"
      aria-label={spec.label}
      className="fixed z-[200] w-64 overflow-auto rounded-md border bg-popover p-1 shadow-md"
      style={placement}
    >
      {spec.matches.map((user, itemIndex) => (
        <li key={user.id} role="presentation">
          <button
            type="button"
            role="option"
            aria-selected={itemIndex === spec.selected}
            className={`flex w-full flex-col items-start rounded px-2 py-1.5 text-left text-sm ${
              itemIndex === spec.selected ? 'bg-accent' : ''
            }`}
            onMouseDown={event => event.preventDefault()}
            onClick={() => spec.onPick(user)}
          >
            <span>{user.name}</span>
            {user.position ? (
              <span className="text-xs text-muted-foreground">
                {user.position}
              </span>
            ) : null}
          </button>
        </li>
      ))}
    </ul>,
    document.body
  );
}
