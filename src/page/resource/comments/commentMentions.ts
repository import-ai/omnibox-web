export type CommentMentionUser = {
  id: string;
  name: string;
  position?: string;
};

export type CommentMentionTrigger = {
  start: number;
  query: string;
};

export type CommentContentPart =
  { type: 'text'; text: string } | { type: 'user'; id: string; label: string };

const MENTION = /\[@\s+([^\]]*)\]/g;
const ATTR = /(\w+)=(?:"([^"]*)"|'([^']*)')/g;

function attribute(attributes: string, name: string) {
  ATTR.lastIndex = 0;
  let match = ATTR.exec(attributes);
  while (match) {
    if (match[1] === name) {
      return match[2] ?? match[3];
    }
    match = ATTR.exec(attributes);
  }
  return undefined;
}

function shortcodeValue(value: string) {
  return value.replace(/["\]]/g, '');
}

export function userMentionShortcode(id: string, label: string) {
  const safeId = shortcodeValue(id);
  const safeLabel = shortcodeValue(label) || safeId;
  if (!safeId) {
    return '';
  }
  return `[@ id="${safeId}" label="${safeLabel}"]`;
}

export function mentionTrigger(
  value: string,
  caret: number
): CommentMentionTrigger | null {
  if (caret < 0 || caret > value.length) {
    return null;
  }
  // @ after CJK or punctuation counts. ASCII before @ is an email, not a mention.
  const match = /(?:^|[^A-Za-z0-9._%+-])@([^\s@\u3000]*)$/.exec(
    value.slice(0, caret)
  );
  if (!match) {
    return null;
  }
  const query = match[1];
  return { start: caret - query.length - 1, query };
}

export function insertUserMention(
  value: string,
  start: number,
  caret: number,
  id: string,
  label: string
) {
  const token = userMentionShortcode(id, label);
  if (!token) {
    return { value, caret };
  }
  const rest = value.slice(caret);
  const spacer = /^\s/.test(rest) ? '' : ' ';
  const next = `${value.slice(0, start)}${token}${spacer}${rest}`;
  return { value: next, caret: start + token.length + spacer.length };
}

export function splitCommentContent(content: string): CommentContentPart[] {
  const parts: CommentContentPart[] = [];
  let last = 0;
  for (const match of content.matchAll(MENTION)) {
    const index = match.index ?? 0;
    if (index > last) {
      parts.push({ type: 'text', text: content.slice(last, index) });
    }
    const attributes = match[1];
    const type = attribute(attributes, 'type');
    const id = attribute(attributes, 'id');
    const label = attribute(attributes, 'label');
    if ((type && type !== 'user') || !id) {
      parts.push({ type: 'text', text: match[0] });
    } else {
      parts.push({ type: 'user', id, label: label || id });
    }
    last = index + match[0].length;
  }
  if (last < content.length) {
    parts.push({ type: 'text', text: content.slice(last) });
  }
  return parts.length ? parts : [{ type: 'text', text: content }];
}

export function filterCommentMentionUsers<T extends CommentMentionUser>(
  users: T[],
  query: string,
  limit = 8
) {
  const needle = query.trim().toLowerCase();
  const seen = new Set<string>();
  const matches: T[] = [];
  for (const user of users) {
    if (!user.id || !user.name || seen.has(user.id)) {
      continue;
    }
    seen.add(user.id);
    const haystack = `${user.name} ${user.position ?? ''}`.toLowerCase();
    if (needle && !haystack.includes(needle)) {
      continue;
    }
    matches.push(user);
    if (matches.length >= limit) {
      break;
    }
  }
  return matches;
}

export function commentMentionLabel(
  id: string,
  label: string,
  namesById: Record<string, string>
) {
  return namesById[id] || label;
}

export function commentMentionActive(
  id: string,
  namesById: Record<string, string>
) {
  return !!namesById[id];
}

export type CommentDraftAtom = {
  displayStart: number;
  displayEnd: number;
  storageStart: number;
  storageEnd: number;
};

export function commentDraftDisplay(
  storage: string,
  namesById: Record<string, string> = {}
) {
  const atoms: CommentDraftAtom[] = [];
  let display = '';
  let last = 0;
  for (const match of storage.matchAll(MENTION)) {
    const index = match.index ?? 0;
    display += storage.slice(last, index);
    const attributes = match[1];
    const type = attribute(attributes, 'type');
    const id = attribute(attributes, 'id');
    const label = attribute(attributes, 'label');
    if ((type && type !== 'user') || !id) {
      display += match[0];
    } else {
      const shown = `@${namesById[id] || label || id}`;
      atoms.push({
        displayStart: display.length,
        displayEnd: display.length + shown.length,
        storageStart: index,
        storageEnd: index + match[0].length,
      });
      display += shown;
    }
    last = index + match[0].length;
  }
  display += storage.slice(last);
  return { display, atoms };
}

export function displayOffsetToStorage(
  draft: { atoms: CommentDraftAtom[] },
  offset: number
) {
  let shift = 0;
  for (const atom of draft.atoms) {
    if (offset <= atom.displayStart) {
      return offset + shift;
    }
    if (offset < atom.displayEnd) {
      return atom.storageStart;
    }
    shift = atom.storageEnd - atom.displayEnd;
    if (offset === atom.displayEnd) {
      return atom.storageEnd;
    }
  }
  return offset + shift;
}

export function storageOffsetToDisplay(
  draft: { atoms: CommentDraftAtom[] },
  offset: number
) {
  let shift = 0;
  for (const atom of draft.atoms) {
    if (offset <= atom.storageStart) {
      return offset + shift;
    }
    if (offset <= atom.storageEnd) {
      return atom.displayEnd;
    }
    shift = atom.displayEnd - atom.storageEnd;
  }
  return offset + shift;
}

export function applyCommentDraftChange(
  storage: string,
  nextDisplay: string,
  namesById: Record<string, string> = {}
) {
  const draft = commentDraftDisplay(storage, namesById);
  const previous = draft.display;
  if (nextDisplay === previous) {
    return storage;
  }
  let start = 0;
  while (
    start < previous.length &&
    start < nextDisplay.length &&
    previous[start] === nextDisplay[start]
  ) {
    start += 1;
  }
  let previousEnd = previous.length;
  let nextEnd = nextDisplay.length;
  while (
    previousEnd > start &&
    nextEnd > start &&
    previous[previousEnd - 1] === nextDisplay[nextEnd - 1]
  ) {
    previousEnd -= 1;
    nextEnd -= 1;
  }
  let displayStart = start;
  let displayEnd = previousEnd;
  for (const atom of draft.atoms) {
    const caretInside =
      displayStart === displayEnd &&
      displayStart > atom.displayStart &&
      displayStart < atom.displayEnd;
    const overlaps =
      displayStart < atom.displayEnd && displayEnd > atom.displayStart;
    if (caretInside || overlaps) {
      displayStart = Math.min(displayStart, atom.displayStart);
      displayEnd = Math.max(displayEnd, atom.displayEnd);
    }
  }
  // A touched mention is removed whole. Keep only text the user actually added.
  const replacement = nextDisplay.slice(start, nextEnd);
  const storageStart = displayOffsetToStorage(draft, displayStart);
  const storageEnd = displayOffsetToStorage(draft, displayEnd);
  return (
    storage.slice(0, storageStart) + replacement + storage.slice(storageEnd)
  );
}

export function mentionMenuPlacement(
  rect: { top: number; bottom: number; left: number },
  viewport: { width: number; height: number },
  menuWidth = 256,
  menuHeight = 192,
  gap = 4
) {
  const spaceBelow = viewport.height - rect.bottom;
  const spaceAbove = rect.top;
  const openUp = spaceBelow < menuHeight && spaceAbove > spaceBelow;
  const left = Math.max(8, Math.min(rect.left, viewport.width - menuWidth - 8));
  if (openUp) {
    return {
      left,
      bottom: viewport.height - rect.top + gap,
      maxHeight: Math.max(96, spaceAbove - gap - 8),
    };
  }
  return {
    left,
    top: rect.bottom + gap,
    maxHeight: Math.max(96, spaceBelow - gap - 8),
  };
}
