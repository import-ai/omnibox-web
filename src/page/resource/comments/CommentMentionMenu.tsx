import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { MentionAvatar } from '@/page/resource/MentionAvatar';

import type { CommentMentionUser } from './commentMentions';
import { mentionMenuPlacement } from './commentMentions';

export type CommentMentionMenuSpec = {
  anchor: HTMLTextAreaElement | null;
  label: string;
  matches: CommentMentionUser[];
  selected: number;
  queryKey: string | null;
  onPick: (user: CommentMentionUser) => void;
};

export function CommentMentionMenu({
  spec,
}: {
  spec: CommentMentionMenuSpec | null;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedId = spec?.matches[spec.selected]?.id;
  const selectedIndex = spec?.selected;
  const queryKey = spec?.queryKey;

  useLayoutEffect(() => {
    const menu = menuRef.current;
    const option = menu?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!menu || !option) return;
    const menuRect = menu.getBoundingClientRect();
    const optionRect = option.getBoundingClientRect();
    const top = menuRect.top + menu.clientTop;
    const bottom = menuRect.bottom - menu.clientTop;
    // Scroll only the menu; scrolling an option into view can move the document.
    if (optionRect.top < top) {
      menu.scrollTop += optionRect.top - top;
    } else if (optionRect.bottom > bottom) {
      menu.scrollTop += optionRect.bottom - bottom;
    }
  }, [selectedId, selectedIndex, queryKey]);

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
      ref={menuRef}
      role="listbox"
      aria-label={spec.label}
      data-selector="tiptap-mention-dropdown-menu"
      className="scrollbar-thin-visible fixed z-[200] overflow-x-hidden overflow-y-auto overscroll-contain"
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
