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
  const match = /(?:^|[\s\u3000])@([^\s@\u3000]*)$/.exec(value.slice(0, caret));
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
