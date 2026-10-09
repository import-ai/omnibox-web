export interface SearchTextPart {
  match: boolean;
  text: string;
}

/** Escape user query so it is matched as a literal string, not a regex pattern. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function splitSearchText(
  text: string,
  searchText: string
): SearchTextPart[] {
  const query = searchText.trim();
  if (!query) {
    return [{ match: false, text }];
  }

  const regex = new RegExp(escapeRegExp(query), 'gi');
  const parts: SearchTextPart[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(regex)) {
    const matched = match[0];
    if (!matched) continue;

    if (match.index > lastIndex) {
      parts.push({ match: false, text: text.slice(lastIndex, match.index) });
    }
    parts.push({ match: true, text: matched });
    lastIndex = match.index + matched.length;
  }

  if (lastIndex < text.length) {
    parts.push({ match: false, text: text.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ match: false, text }];
}
