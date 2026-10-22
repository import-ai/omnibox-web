import {
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type SyntheticEvent,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import type { CommentMentionUser } from './commentMentions';
import {
  applyCommentDraftChange,
  commentDraftDisplay,
  displayOffsetToStorage,
  filterCommentMentionUsers,
  insertUserMention,
  mentionTrigger,
  storageOffsetToDisplay,
} from './commentMentions';
import { useCommentMentionUsers } from './useCommentMentionUsers';

export function useCommentMentionInput(
  value: string,
  onValueChange: (value: string) => void
) {
  const { t } = useTranslation();
  const { users, namesById } = useCommentMentionUsers();
  const [caret, setCaret] = useState(0);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const elementRef = useRef<HTMLTextAreaElement | null>(null);
  const pendingCaret = useRef<number | null>(null);
  const draft = commentDraftDisplay(value, namesById);
  const safeCaret = Math.min(caret, draft.display.length);
  const query = mentionTrigger(draft.display, safeCaret);
  const matches = query ? filterCommentMentionUsers(users, query.query) : [];
  const signature = query ? `${query.start}:${query.query}` : null;
  const open = !!query && matches.length > 0 && dismissed !== signature;
  const selected = Math.min(index, Math.max(matches.length - 1, 0));
  const queryRef = useRef(query);
  const caretRef = useRef(safeCaret);
  queryRef.current = query;
  caretRef.current = safeCaret;

  useLayoutEffect(() => {
    const element = elementRef.current;
    const next = pendingCaret.current;
    if (!element || next === null) {
      return;
    }
    pendingCaret.current = null;
    element.focus({ preventScroll: true });
    element.selectionStart = next;
    element.selectionEnd = next;
  }, [draft.display]);

  const track = (element: HTMLTextAreaElement) => {
    elementRef.current = element;
    setCaret(element.selectionStart ?? element.value.length);
  };

  const pick = (user: CommentMentionUser) => {
    const current = queryRef.current;
    if (!current) {
      return;
    }
    const next = insertUserMention(
      value,
      displayOffsetToStorage(draft, current.start),
      displayOffsetToStorage(draft, caretRef.current),
      user.id,
      user.name
    );
    const nextCaret = storageOffsetToDisplay(
      commentDraftDisplay(next.value, namesById),
      next.caret
    );
    pendingCaret.current = nextCaret;
    setCaret(nextCaret);
    setDismissed(null);
    onValueChange(next.value);
  };

  const menu = open
    ? {
        anchor: elementRef.current,
        label: t('resource_comments.mention_members'),
        matches,
        selected,
        onPick: pick,
      }
    : null;

  return {
    displayValue: draft.display,
    atoms: draft.atoms,
    menu,
    inputProps: {
      onChange: (event: ChangeEvent<HTMLTextAreaElement>) => {
        track(event.currentTarget);
        onValueChange(
          applyCommentDraftChange(value, event.currentTarget.value, namesById)
        );
      },
      onClick: (event: ReactMouseEvent<HTMLTextAreaElement>) => {
        track(event.currentTarget);
      },
      onKeyUp: (event: KeyboardEvent<HTMLTextAreaElement>) => {
        track(event.currentTarget);
      },
      onSelect: (event: SyntheticEvent<HTMLTextAreaElement>) => {
        track(event.currentTarget);
      },
      onBlur: () => {
        setDismissed(signature);
      },
    },
    onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (!open || event.nativeEvent.isComposing) {
        return false;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        setIndex(current => {
          const last = matches.length - 1;
          const base = Math.min(current, last);
          return event.key === 'ArrowDown'
            ? (base + 1) % matches.length
            : (base + last) % matches.length;
        });
        return true;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setDismissed(signature);
        return true;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat) {
          pick(matches[selected]);
        }
        return true;
      }
      return false;
    },
  };
}
