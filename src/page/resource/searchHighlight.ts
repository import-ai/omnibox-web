const SEARCH_MARK_CLASS = 'search-query-mark';

/** Escape user query so it is matched as a literal string, not a regex pattern. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

  const regex = new RegExp(escapeRegExp(query), 'gi');
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
    regex.lastIndex = 0;

    if (!regex.test(text)) {
      continue;
    }
    regex.lastIndex = 0;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const matched = match[0];
      if (!matched) {
        // Avoid zero-length match infinite loops.
        regex.lastIndex += 1;
        continue;
      }

      if (start > lastIndex) {
        fragment.appendChild(
          document.createTextNode(text.slice(lastIndex, start))
        );
      }

      const mark = document.createElement('mark');
      mark.className = SEARCH_MARK_CLASS;
      // Color comes from resourceEditor.css (editor highlight yellow tokens).
      mark.textContent = matched;
      fragment.appendChild(mark);
      matchCount += 1;
      lastIndex = start + matched.length;
    }

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

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
