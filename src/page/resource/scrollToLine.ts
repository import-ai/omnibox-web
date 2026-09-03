export function parseScrollToLine(value: string | null): number | undefined {
  const match = value?.match(/^#?L(\d+)$/);
  if (!match) return undefined;

  const lineNumber = Number(match[1]);
  return Number.isSafeInteger(lineNumber) && lineNumber > 0
    ? lineNumber
    : undefined;
}

function normalizeMarkdownLine(line: string): string {
  return line
    .trim()
    .replace(/^(?:#{1,6}\s+|>\s*|[-+*]\s+|\d+[.)]\s+)/, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_~`]/g, '')
    .trim();
}

function countOccurrences(text: string, search: string): number {
  let count = 0;
  let from = 0;

  while ((from = text.indexOf(search, from)) !== -1) {
    count += 1;
    from += search.length;
  }

  return count;
}

function getLineTarget(content: string, lineNumber: number) {
  const lines = content.split(/\r?\n/);
  if (lineNumber > lines.length) return null;

  let targetIndex = lineNumber - 1;
  let text = normalizeMarkdownLine(lines[targetIndex] ?? '');
  while (!text && targetIndex + 1 < lines.length) {
    targetIndex += 1;
    text = normalizeMarkdownLine(lines[targetIndex] ?? '');
  }
  if (!text) return null;

  const occurrence =
    lines
      .slice(0, targetIndex)
      .map(normalizeMarkdownLine)
      .reduce((count, line) => count + countOccurrences(line, text), 0) + 1;

  return { occurrence, text };
}

function findOccurrence(text: string, search: string, occurrence: number) {
  let from = 0;
  let found = -1;

  for (let count = 0; count < occurrence; count += 1) {
    found = text.indexOf(search, from);
    if (found === -1) return -1;
    from = found + search.length;
  }

  return found;
}

export function scrollRenderedContentToLine(
  container: HTMLElement,
  content: string,
  lineNumber: number
): boolean {
  const target = getLineTarget(content, lineNumber);
  if (!target) return false;

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const segments: Array<{ node: Text; start: number }> = [];
  let renderedText = '';
  let node = walker.nextNode();

  while (node) {
    const textNode = node as Text;
    segments.push({ node: textNode, start: renderedText.length });
    renderedText += textNode.data;
    node = walker.nextNode();
  }

  const offset = findOccurrence(renderedText, target.text, target.occurrence);
  if (offset === -1) return false;

  const segment =
    segments.find(
      item =>
        offset >= item.start && offset < item.start + item.node.data.length
    ) ?? null;
  if (!segment) return false;

  const anchor = document.createElement('span');
  anchor.dataset.scrollLineTarget = 'true';
  anchor.setAttribute('aria-hidden', 'true');
  anchor.style.cssText =
    'display:inline-block;width:0;height:1em;pointer-events:none;vertical-align:top';

  const range = document.createRange();
  range.setStart(segment.node, offset - segment.start);
  range.collapse(true);
  range.insertNode(anchor);
  anchor.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const parent = anchor.parentNode;
  anchor.remove();
  parent?.normalize();
  return true;
}
