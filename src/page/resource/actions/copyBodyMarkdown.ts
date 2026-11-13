import { fromMarkdown } from 'mdast-util-from-markdown';

type MarkdownNode = {
  type: string;
  value?: string;
  children?: MarkdownNode[];
  position?: { start: { offset?: number }; end: { offset?: number } };
};

type SourceRange = { start: number; end: number };

const voidHtmlTags = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

/** Remove editor color wrappers without serializing or rewriting the body. */
export function copyBodyMarkdown(markdown: string): string {
  if (!markdown.includes('[text-color')) return markdown;

  const removed: SourceRange[] = [];
  const visit = (node: MarkdownNode) => {
    if (node.type === 'paragraph' || node.type === 'heading') {
      collectColorWrappers(node, markdown, removed);
      return;
    }
    node.children?.forEach(visit);
  };
  visit(fromMarkdown(markdown));

  const parts: string[] = [];
  let cursor = 0;
  for (const { start, end } of removed.sort((a, b) => a.start - b.start)) {
    parts.push(markdown.slice(cursor, start));
    cursor = end;
  }
  parts.push(markdown.slice(cursor));
  return parts.join('');
}

function collectColorWrappers(
  block: MarkdownNode,
  markdown: string,
  removed: SourceRange[]
) {
  const opened: SourceRange[] = [];
  const htmlTags: string[] = [];
  const visit = (node: MarkdownNode) => {
    if (node.type === 'html') {
      trackHtmlTags(node.value ?? '', htmlTags);
      return;
    }
    if (node.type === 'text' && htmlTags.length === 0) {
      const start = node.position?.start.offset;
      const end = node.position?.end.offset;
      if (start === undefined || end === undefined) return;

      const source = markdown.slice(start, end);
      const marker =
        /\[\/text-color\]|\[text-color(?:\s+color=(?:"[^"\r\n]*"|'[^'\r\n]*'|[^"'\s\]]+))?\s*\]/g;
      for (const match of source.matchAll(marker)) {
        const offset = start + match.index!;
        if (isEscaped(markdown, offset)) continue;
        const range = { start: offset, end: offset + match[0].length };
        if (match[0].startsWith('[/')) {
          const opening = opened.pop();
          if (opening) removed.push(opening, range);
        } else {
          opened.push(range);
        }
      }
    }
    node.children?.forEach(visit);
  };
  block.children?.forEach(visit);
}

function isEscaped(markdown: string, offset: number): boolean {
  let backslashes = 0;
  while (offset > 0 && markdown[--offset] === '\\') backslashes += 1;
  return backslashes % 2 === 1;
}

function trackHtmlTags(source: string, opened: string[]) {
  const closing = /^<\/([a-z][\w:-]*)\s*>/i.exec(source);
  if (closing) {
    const index = opened.lastIndexOf(closing[1].toLowerCase());
    if (index !== -1) opened.length = index;
    return;
  }
  const opening = /^<([a-z][\w:-]*)(?:\s|\/?>)/i.exec(source);
  if (!opening || /\/>$/.test(source)) return;
  const tag = opening[1].toLowerCase();
  if (!voidHtmlTags.has(tag)) opened.push(tag);
}
