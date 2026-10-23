import {
  cloneElement,
  type CompositionEvent,
  type ReactElement,
  type ReactNode,
  type UIEvent,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import type { CommentDraftAtom } from './commentMentions';

type MentionFieldChild = {
  onScroll?: (event: UIEvent<HTMLTextAreaElement>) => void;
  onCompositionStart?: (event: CompositionEvent<HTMLTextAreaElement>) => void;
  onCompositionEnd?: (event: CompositionEvent<HTMLTextAreaElement>) => void;
};

type FieldProps = {
  display: string;
  atoms: CommentDraftAtom[];
  children: ReactElement<MentionFieldChild>;
};

export function CommentMentionField({ display, atoms, children }: FieldProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const [composing, setComposing] = useState(false);

  useLayoutEffect(() => {
    const field = rootRef.current;
    const mirror = mirrorRef.current;
    const textarea = field?.querySelector('textarea');
    if (!field || !mirror || !textarea) {
      return;
    }
    const style = getComputedStyle(textarea);
    // ponytail: copy the textarea box so the blue name lines up. One contenteditable if the metrics drift.
    mirror.style.font = style.font;
    mirror.style.letterSpacing = style.letterSpacing;
    mirror.style.padding = style.padding;
    mirror.style.borderTopWidth = style.borderTopWidth;
    mirror.style.borderRightWidth = style.borderRightWidth;
    mirror.style.borderBottomWidth = style.borderBottomWidth;
    mirror.style.borderLeftWidth = style.borderLeftWidth;
    mirror.style.borderStyle = 'solid';
    mirror.style.borderColor = 'transparent';
    mirror.style.boxSizing = style.boxSizing;
    mirror.style.lineHeight = style.lineHeight;
    mirror.scrollTop = textarea.scrollTop;
    field.style.borderRadius = style.borderRadius;
  });

  const onScroll = (event: UIEvent<HTMLTextAreaElement>) => {
    if (mirrorRef.current) {
      mirrorRef.current.scrollTop = event.currentTarget.scrollTop;
    }
    children.props.onScroll?.(event);
  };

  let cursor = 0;
  const pieces: ReactNode[] = [];
  for (const atom of atoms) {
    if (atom.displayStart > cursor) {
      pieces.push(display.slice(cursor, atom.displayStart));
    }
    pieces.push(
      <span
        key={`${atom.storageStart}:${atom.displayStart}`}
        className="omnibox-comment-mention"
      >
        {display.slice(atom.displayStart, atom.displayEnd)}
      </span>
    );
    cursor = atom.displayEnd;
  }
  if (cursor < display.length) {
    pieces.push(display.slice(cursor));
  }

  return (
    <div
      ref={rootRef}
      className={`omnibox-comment-mention-field${composing ? ' is-composing' : ''}`}
    >
      <div
        ref={mirrorRef}
        className="omnibox-comment-mention-field__mirror"
        aria-hidden="true"
      >
        {pieces}
        {display.endsWith('\n') ? <br /> : null}
      </div>
      {cloneElement(children, {
        onScroll,
        onCompositionStart: (event: CompositionEvent<HTMLTextAreaElement>) => {
          setComposing(true);
          children.props.onCompositionStart?.(event);
        },
        onCompositionEnd: (event: CompositionEvent<HTMLTextAreaElement>) => {
          setComposing(false);
          children.props.onCompositionEnd?.(event);
        },
      })}
    </div>
  );
}
