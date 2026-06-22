export interface TiptapJsonContent {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: TiptapJsonContent[];
  marks?: Array<{
    type: string;
    attrs?: Record<string, unknown>;
  }>;
  text?: string;
}

interface MarkdownParseOptions {
  linkBase?: string;
}

const diagramLanguages = new Set([
  'abc',
  'echarts',
  'flowchart',
  'graphviz',
  'markmap',
  'mermaid',
  'mindmap',
  'plantuml',
  'smiles',
]);

function normalizeCodeBlockLanguage(language: string | null | undefined) {
  return language?.trim().toLowerCase() || '';
}

function unescapeDiagramCode(code: string) {
  let normalized = code;

  for (let index = 0; index < 10; index += 1) {
    const next = normalized
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\+(["'`{}[\](),:])/g, '$1');

    if (next === normalized) {
      break;
    }

    normalized = next;
  }

  return normalized;
}

function normalizeCodeBlockContent(language: string, code: string) {
  return diagramLanguages.has(normalizeCodeBlockLanguage(language))
    ? unescapeDiagramCode(code)
    : code;
}

function isRelativeUrl(url: string) {
  return (
    !!url &&
    !url.startsWith('/') &&
    !url.startsWith('#') &&
    !/^[a-z][a-z\d+.-]*:/i.test(url)
  );
}

function resolveUrl(url: string, options?: MarkdownParseOptions) {
  const linkBase = options?.linkBase?.replace(/\/$/, '');

  if (!linkBase || !isRelativeUrl(url)) {
    return url;
  }

  return `${linkBase}/${url.replace(/^\.\//, '')}`;
}

function textNode(
  text: string,
  marks?: TiptapJsonContent['marks']
): TiptapJsonContent {
  return marks?.length ? { type: 'text', text, marks } : { type: 'text', text };
}

function paragraph(content: TiptapJsonContent[] = []): TiptapJsonContent {
  return { type: 'paragraph', content };
}

function isImageNode(node: TiptapJsonContent) {
  return node.type === 'image';
}

function appendInlineBlocks(
  blocks: TiptapJsonContent[],
  inlineNodes: TiptapJsonContent[]
) {
  let paragraphContent: TiptapJsonContent[] = [];

  inlineNodes.forEach(node => {
    if (!isImageNode(node)) {
      paragraphContent.push(node);
      return;
    }

    if (paragraphContent.length) {
      blocks.push(paragraph(paragraphContent));
      paragraphContent = [];
    }

    blocks.push(node);
  });

  if (paragraphContent.length) {
    blocks.push(paragraph(paragraphContent));
  }
}

function inlineMath(latex: string): TiptapJsonContent {
  return { type: 'inlineMath', attrs: { latex } };
}

function blockMath(latex: string): TiptapJsonContent {
  return { type: 'blockMath', attrs: { latex } };
}

function getCellSpan(value: string | null): number {
  const parsed = Number(value || 1);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function tableCell(
  element: HTMLTableCellElement,
  type: 'tableCell' | 'tableHeader'
): TiptapJsonContent {
  const text = element.textContent?.replace(/\s+/g, ' ').trim() || '';

  return {
    type,
    attrs: {
      backgroundColor: null,
      nodeTextAlign: null,
      nodeVerticalAlign: null,
      colspan: getCellSpan(element.getAttribute('colspan')),
      rowspan: getCellSpan(element.getAttribute('rowspan')),
      colwidth: null,
    },
    content: [paragraph(text ? parseInline(text) : [])],
  };
}

function htmlTableToTiptapJson(html: string): TiptapJsonContent[] {
  if (typeof DOMParser === 'undefined') {
    return [paragraph([textNode(html)])];
  }

  const document = new DOMParser().parseFromString(html, 'text/html');
  const tables = Array.from(document.querySelectorAll('table'));

  return tables
    .map<TiptapJsonContent | null>(table => {
      const rows = Array.from(table.querySelectorAll('tr'))
        .map<TiptapJsonContent | null>(row => {
          const cells = Array.from(row.children)
            .filter(
              (cell): cell is HTMLTableCellElement =>
                cell instanceof HTMLTableCellElement
            )
            .map(cell =>
              tableCell(
                cell,
                cell.tagName.toLowerCase() === 'th'
                  ? 'tableHeader'
                  : 'tableCell'
              )
            );

          return cells.length ? { type: 'tableRow', content: cells } : null;
        })
        .filter((row): row is TiptapJsonContent => Boolean(row));

      return rows.length ? { type: 'table', content: rows } : null;
    })
    .filter((table): table is TiptapJsonContent => Boolean(table));
}

function htmlImageToTiptapJson(
  html: string,
  options?: MarkdownParseOptions
): TiptapJsonContent[] {
  if (typeof DOMParser === 'undefined') {
    return [paragraph([textNode(html)])];
  }

  const document = new DOMParser().parseFromString(html, 'text/html');
  const images = Array.from(document.querySelectorAll('img'));

  return images.map(image => ({
    type: 'image',
    attrs: {
      src: resolveUrl(image.getAttribute('src') || '', options),
      alt: image.getAttribute('alt') || null,
      title: image.getAttribute('title') || null,
      showCaption: false,
    },
  }));
}

function parseInline(
  markdown: string,
  options?: MarkdownParseOptions
): TiptapJsonContent[] {
  const nodes: TiptapJsonContent[] = [];
  const tokenPattern =
    /(!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]+)")?\))|(\[([^\]]+)\]\(([^)\s]+)\))|(`([^`]+)`)|(\$([^$\n]+)\$)|(\*\*([^*]+)\*\*)|(~~([^~]+)~~)|(\*([^*]+)\*)/g;
  let index = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(markdown))) {
    if (match.index > index) {
      nodes.push(textNode(markdown.slice(index, match.index)));
    }

    if (match[1]) {
      nodes.push({
        type: 'image',
        attrs: {
          src: resolveUrl(match[3], options),
          alt: match[2] || null,
          title: match[4] || null,
          showCaption: false,
        },
      });
    } else if (match[5]) {
      nodes.push(
        textNode(match[6], [{ type: 'link', attrs: { href: match[7] } }])
      );
    } else if (match[8]) {
      nodes.push(textNode(match[9], [{ type: 'code' }]));
    } else if (match[10]) {
      nodes.push(inlineMath(match[11].trim()));
    } else if (match[12]) {
      nodes.push(textNode(match[13], [{ type: 'bold' }]));
    } else if (match[14]) {
      nodes.push(textNode(match[15], [{ type: 'strike' }]));
    } else if (match[16]) {
      nodes.push(textNode(match[17], [{ type: 'italic' }]));
    }

    index = tokenPattern.lastIndex;
  }

  if (index < markdown.length) {
    nodes.push(textNode(markdown.slice(index)));
  }

  return nodes;
}

function parseTableRow(line: string) {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map(cell => cell.trim());
}

function isTableSeparator(line: string) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function isHorizontalRule(line: string) {
  return /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line);
}

function isBlockMathStart(line: string) {
  return /^\s*\$\$\s*$/.test(line);
}

function isSingleLineBlockMath(line: string) {
  return /^\s*\$\$[\s\S]+\$\$\s*$/.test(line);
}

function isHtmlTableStart(line: string) {
  return /<table[\s>]/i.test(line);
}

function isHtmlImage(line: string) {
  return /<img[\s>]/i.test(line);
}

function isHtmlTableEnd(line: string) {
  return /<\/table>/i.test(line);
}

function isBlockStart(line: string) {
  return (
    /^#{1,6}\s+/.test(line) ||
    /^>\s?/.test(line) ||
    /^```/.test(line) ||
    isBlockMathStart(line) ||
    isSingleLineBlockMath(line) ||
    /^(\s*)([-*+]|\d+[.)])\s+/.test(line) ||
    /^!\[[^\]]*]\([^)]+\)\s*$/.test(line) ||
    isHtmlTableStart(line) ||
    isHtmlImage(line) ||
    isHorizontalRule(line)
  );
}

function makeListItem(
  text: string,
  options?: MarkdownParseOptions
): TiptapJsonContent {
  return { type: 'listItem', content: [paragraph(parseInline(text, options))] };
}

function makeTaskItem(
  text: string,
  checked: boolean,
  options?: MarkdownParseOptions
): TiptapJsonContent {
  return {
    type: 'taskItem',
    attrs: { checked },
    content: [paragraph(parseInline(text, options))],
  };
}

export function markdownToTiptapJson(
  markdown: string,
  options?: MarkdownParseOptions
): TiptapJsonContent {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const content: TiptapJsonContent[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (isHtmlTableStart(line)) {
      const htmlLines = [line];
      i += 1;

      while (i < lines.length && !isHtmlTableEnd(htmlLines.at(-1) || '')) {
        htmlLines.push(lines[i]);
        i += 1;
      }

      const tables = htmlTableToTiptapJson(htmlLines.join('\n'));
      content.push(...tables);
      continue;
    }

    if (isHtmlImage(line)) {
      const images = htmlImageToTiptapJson(line, options);
      content.push(...images);
      i += 1;
      continue;
    }

    if (isBlockMathStart(line)) {
      const latexLines: string[] = [];
      i += 1;

      while (i < lines.length && !isBlockMathStart(lines[i])) {
        latexLines.push(lines[i]);
        i += 1;
      }

      if (i < lines.length) {
        i += 1;
      }

      content.push(blockMath(latexLines.join('\n').trim()));
      continue;
    }

    if (isSingleLineBlockMath(line)) {
      content.push(blockMath(line.replace(/^\s*\$\$|\$\$\s*$/g, '').trim()));
      i += 1;
      continue;
    }

    const fence = line.match(/^```(\S*)\s*$/);
    if (fence) {
      const language = fence[1] || '';
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      const codeText = normalizeCodeBlockContent(language, code.join('\n'));
      content.push({
        type: 'codeBlock',
        attrs: { language: language || null },
        content: codeText ? [textNode(codeText)] : undefined,
      });
      continue;
    }

    if (i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const headers = parseTableRow(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        rows.push(parseTableRow(lines[i]));
        i += 1;
      }
      content.push({
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: headers.map(cell => ({
              type: 'tableHeader',
              content: [paragraph(parseInline(cell, options))],
            })),
          },
          ...rows.map(row => ({
            type: 'tableRow',
            content: row.map(cell => ({
              type: 'tableCell',
              content: [paragraph(parseInline(cell, options))],
            })),
          })),
        ],
      });
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      content.push({
        type: 'heading',
        attrs: { level: heading[1].length },
        content: parseInline(heading[2], options),
      });
      i += 1;
      continue;
    }

    if (isHorizontalRule(line)) {
      content.push({ type: 'horizontalRule' });
      i += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoted: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoted.push(lines[i].replace(/^>\s?/, ''));
        i += 1;
      }
      content.push({
        type: 'blockquote',
        content: markdownToTiptapJson(quoted.join('\n'), options).content,
      });
      continue;
    }

    const taskItem = line.match(/^\s*[-*+]\s+\[([ xX])]\s+(.+)$/);
    if (taskItem) {
      const items: TiptapJsonContent[] = [];
      while (i < lines.length) {
        const item = lines[i].match(/^\s*[-*+]\s+\[([ xX])]\s+(.+)$/);
        if (!item) break;
        items.push(
          makeTaskItem(item[2], item[1].toLowerCase() === 'x', options)
        );
        i += 1;
      }
      content.push({ type: 'taskList', content: items });
      continue;
    }

    const bulletItem = line.match(/^\s*[-*+]\s+(.+)$/);
    if (bulletItem) {
      const items: TiptapJsonContent[] = [];
      while (i < lines.length) {
        const item = lines[i].match(/^\s*[-*+]\s+(.+)$/);
        if (!item || /^\s*[-*+]\s+\[[ xX]]\s+/.test(lines[i])) break;
        items.push(makeListItem(item[1], options));
        i += 1;
      }
      content.push({ type: 'bulletList', content: items });
      continue;
    }

    const orderedItem = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (orderedItem) {
      const items: TiptapJsonContent[] = [];
      while (i < lines.length) {
        const item = lines[i].match(/^\s*\d+[.)]\s+(.+)$/);
        if (!item) break;
        items.push(makeListItem(item[1], options));
        i += 1;
      }
      content.push({
        type: 'orderedList',
        attrs: { start: 1 },
        content: items,
      });
      continue;
    }

    const image = line.match(/^!\[([^\]]*)]\(([^)\s]+)(?:\s+"([^"]+)")?\)\s*$/);
    if (image) {
      content.push({
        type: 'image',
        attrs: {
          src: resolveUrl(image[2], options),
          alt: image[1] || null,
          title: image[3] || null,
          showCaption: false,
        },
      });
      i += 1;
      continue;
    }

    const paragraphLines = [line];
    i += 1;
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
      paragraphLines.push(lines[i]);
      i += 1;
    }
    const paragraphContent: TiptapJsonContent[] = [];
    paragraphLines.forEach((paragraphLine, lineIndex) => {
      if (lineIndex > 0) paragraphContent.push({ type: 'hardBreak' });
      paragraphContent.push(...parseInline(paragraphLine, options));
    });
    appendInlineBlocks(content, paragraphContent);
  }

  return { type: 'doc', content: content.length ? content : [paragraph()] };
}

export function contentToTiptapJson(
  content: string,
  options?: MarkdownParseOptions
): TiptapJsonContent {
  const trimmed = content.trim();
  if (!trimmed) {
    return markdownToTiptapJson('', options);
  }

  try {
    const parsed = JSON.parse(trimmed) as TiptapJsonContent;
    if (parsed?.type === 'doc' && Array.isArray(parsed.content)) {
      return parsed;
    }
  } catch {
    // Not a serialized Tiptap document. Treat it as Markdown.
  }

  return markdownToTiptapJson(content, options);
}

function escapeMarkdownText(text: string) {
  return text.replace(/([\\`*_{}\[\]()#+\-.!|>])/g, '\\$1');
}

function inlineToMarkdown(nodes: TiptapJsonContent[] = []): string {
  return nodes
    .map(node => {
      if (node.type === 'hardBreak') return '\n';
      if (node.type === 'inlineMath') {
        return `$${String(node.attrs?.latex || '')}$`;
      }
      if (node.type === 'image') {
        const src = String(node.attrs?.src || '');
        const alt = String(node.attrs?.alt || '');
        const title = node.attrs?.title ? ` "${String(node.attrs.title)}"` : '';
        return `![${alt}](${src}${title})`;
      }
      let value = escapeMarkdownText(node.text || '');
      node.marks?.forEach(mark => {
        if (mark.type === 'bold') value = `**${value}**`;
        if (mark.type === 'italic') value = `*${value}*`;
        if (mark.type === 'strike') value = `~~${value}~~`;
        if (mark.type === 'code') value = `\`${node.text || ''}\``;
        if (mark.type === 'link') {
          value = `[${value}](${String(mark.attrs?.href || '')})`;
        }
      });
      return value;
    })
    .join('');
}

function blockToMarkdown(node: TiptapJsonContent, index = 0): string {
  switch (node.type) {
    case 'heading':
      return `${'#'.repeat(Number(node.attrs?.level || 1))} ${inlineToMarkdown(
        node.content
      )}`;
    case 'paragraph':
      return inlineToMarkdown(node.content);
    case 'blockquote':
      return (node.content || [])
        .map(child => blockToMarkdown(child))
        .join('\n\n')
        .split('\n')
        .map(line => `> ${line}`)
        .join('\n');
    case 'codeBlock':
      return `\`\`\`${node.attrs?.language || ''}\n${node.content?.[0]?.text || ''}\n\`\`\``;
    case 'blockMath':
      return `$$\n${node.attrs?.latex || ''}\n$$`;
    case 'horizontalRule':
      return '---';
    case 'bulletList':
      return (node.content || [])
        .map(item => `- ${inlineToMarkdown(item.content?.[0]?.content)}`)
        .join('\n');
    case 'orderedList':
      return (node.content || [])
        .map((item, itemIndex) => {
          const start = Number(node.attrs?.start || 1);
          return `${start + itemIndex}. ${inlineToMarkdown(
            item.content?.[0]?.content
          )}`;
        })
        .join('\n');
    case 'taskList':
      return (node.content || [])
        .map(item => {
          const checked = item.attrs?.checked ? 'x' : ' ';
          return `- [${checked}] ${inlineToMarkdown(item.content?.[0]?.content)}`;
        })
        .join('\n');
    case 'image': {
      const src = String(node.attrs?.src || '');
      const alt = String(node.attrs?.alt || '');
      const title = node.attrs?.title ? ` "${String(node.attrs.title)}"` : '';
      return `![${alt}](${src}${title})`;
    }
    case 'table': {
      const rows = node.content || [];
      const cells = rows.map(row =>
        (row.content || []).map(cell =>
          inlineToMarkdown(cell.content?.[0]?.content)
        )
      );
      if (!cells.length) return '';
      const header = cells[0];
      const separator = header.map(() => '---');
      return [header, separator, ...cells.slice(1)]
        .map(row => `| ${row.join(' | ')} |`)
        .join('\n');
    }
    default:
      return index === 0 ? inlineToMarkdown(node.content) : '';
  }
}

export function tiptapJsonToMarkdown(json: TiptapJsonContent): string {
  return (json.content || [])
    .map((node, index) => blockToMarkdown(node, index))
    .filter(Boolean)
    .join('\n\n');
}

export function contentToMarkdown(content: string): string {
  const json = contentToTiptapJson(content);
  return tiptapJsonToMarkdown(json);
}
