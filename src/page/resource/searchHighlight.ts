const SEARCH_MARK_CLASS = 'search-query-mark';

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

function isInsideSearchMark(node: Node): boolean {
  const parent = node.parentElement;
  return Boolean(parent?.closest(`mark.${SEARCH_MARK_CLASS}`));
}

/**
 * Wrap case-insensitive matches of `searchText` in <mark class="search-query-mark">.
 * Safe for regex metacharacters; skips text already inside a search mark (no nesting).
 */
export function highlightSearchText(
  container: HTMLElement,
  searchText: string
): number {
  const query = searchText.trim();
  if (!query) {
    return 0;
  }

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent || isInsideSearchMark(node)) {
        return NodeFilter.FILTER_REJECT;
      }
      return node.textContent.toLowerCase().includes(query.toLowerCase())
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_SKIP;
    },
  });

  const nodesToHighlight: Text[] = [];
  let current: Node | null;
  while ((current = walker.nextNode())) {
    nodesToHighlight.push(current as Text);
  }

  let matchCount = 0;

  for (const textNode of nodesToHighlight) {
    const text = textNode.textContent ?? '';
    const parts = splitSearchText(text, query);
    if (!parts.some(part => part.match)) {
      continue;
    }

    const fragment = document.createDocumentFragment();
    parts.forEach(part => {
      if (!part.match) {
        fragment.appendChild(document.createTextNode(part.text));
        return;
      }

      const mark = document.createElement('mark');
      mark.className = SEARCH_MARK_CLASS;
      mark.textContent = part.text;
      fragment.appendChild(mark);
      matchCount += 1;
    });

    textNode.parentNode?.replaceChild(fragment, textNode);
  }

  return matchCount;
}

export function findFirstSearchMatchElement(
  container: HTMLElement,
  searchText: string
): HTMLElement | null {
  const query = searchText.trim();
  if (!query) {
    return null;
  }

  const existing = container.querySelector(
    `mark.${SEARCH_MARK_CLASS}`
  ) as HTMLElement | null;
  if (existing) {
    return existing;
  }

  const lower = query.toLowerCase();
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.textContent?.toLowerCase().includes(lower)) {
      return node.parentElement;
    }
  }
  return null;
}
