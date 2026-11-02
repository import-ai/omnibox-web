import { createPortal } from 'react-dom';

import { MentionAvatar } from '@/page/resource/MentionAvatar';

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
    <div
      role="listbox"
      aria-label={spec.label}
      data-selector="tiptap-mention-dropdown-menu"
      className="fixed z-[200] overflow-auto"
      style={placement}
    >
      <div className="tiptap-card">
        <div className="tiptap-card-body">
          <div className="tiptap-card-item-group" data-orientation="vertical">
            {spec.matches.map((user, itemIndex) => (
              <button
                key={user.id}
                type="button"
                role="option"
                aria-selected={itemIndex === spec.selected}
                className="tiptap-button"
                data-active-state={itemIndex === spec.selected ? 'on' : 'off'}
                data-user-id={user.id}
                onMouseDown={event => event.preventDefault()}
                onClick={() => spec.onPick(user)}
              >
                <MentionAvatar
                  initial={Array.from(user.name)[0]?.toLocaleUpperCase() || ''}
                />
                <span className="tiptap-button-text">{user.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
