import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { gfm } from 'micromark-extension-gfm';

import { normalizeCopyBodyEditorSyntax } from './copyBodyEditorSyntax';

type MarkdownNode = {
  type: string;
  value?: string;
  children?: MarkdownNode[];
  url?: string;
  alt?: string | null;
  identifier?: string;
  ordered?: boolean | null;
  start?: number | null;
  checked?: boolean | null;
  position?: { start: { offset?: number }; end: { offset?: number } };
};
type Range = { start: number; end: number };

const parse = (source: string): MarkdownNode =>
  fromMarkdown(source, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  });

/** Serialize the body, not its Markdown or rich-text presentation. */
export function copyBodyPlainText(markdown: string): string {
  const source = removeStyleWrappers(
    normalizeCopyBodyEditorSyntax(markdown, parse(markdown))
  );
  const tree = parse(source);
  const definitions = new Map<string, string>();
  const visit = (node: MarkdownNode) => {
    if (node.type === 'definition' && node.identifier && node.url) {
      definitions.set(node.identifier.toUpperCase(), node.url);
    }
    node.children?.forEach(visit);
  };
  visit(tree);

  const link = (label: string, url?: string) =>
    !url || label === url ? label : label ? `${label}（${url}）` : url;
  const blocks = (nodes: MarkdownNode[] = []) =>
    nodes.map(render).filter(Boolean).join('\n\n');
  const inline = (nodes: MarkdownNode[] = []): string => {
    let text = '';
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index];
      const opening =
        node.type === 'html' &&
        /^<(code|pre|a|script|style|template|noscript)\b/i.exec(
          node.value ?? ''
        );
      if (opening) {
        const tag = opening[1].toLowerCase();
        let depth = 1;
        const end = nodes.findIndex((candidate, offset) => {
          if (offset <= index || candidate.type !== 'html') return false;
          const value = candidate.value ?? '';
          if (tag === 'template' && /^<template\b/i.test(value)) depth += 1;
          if (new RegExp(`^<\\/${tag}\\s*>`, 'i').test(value)) depth -= 1;
          return depth === 0;
        });
        const hidden = ['script', 'style', 'template', 'noscript'].includes(
          tag
        );
        if (hidden) {
          index = end === -1 ? nodes.length : end;
          continue;
        }
        if (end !== -1) {
          if (tag === 'a') {
            const element = new DOMParser().parseFromString(
              node.value!,
              'text/html'
            ).body.firstElementChild;
            text += link(
              inline(nodes.slice(index + 1, end)),
              element?.getAttribute('href') ?? undefined
            );
          } else {
            const startOffset = node.position?.start.offset;
            const endOffset = nodes[end].position?.end.offset;
            if (startOffset === undefined || endOffset === undefined)
              throw new Error('Missing HTML source range');
            text += html(source.slice(startOffset, endOffset));
          }
          index = end;
          continue;
        }
      }
      text += render(node);
    }
    return text;
  };
  const list = (node: MarkdownNode): string =>
    (node.children ?? [])
      .map((item, index) => {
        const marker = node.ordered ? `${(node.start ?? 1) + index}. ` : '- ';
        const checkbox =
          item.checked == null ? '' : item.checked ? '[x] ' : '[ ] ';
        const content = (item.children ?? []).some(
          child => child.type === 'text'
        )
          ? render({ type: 'htmlContainer', children: item.children })
          : (item.children ?? [])
              .map(
                (child, offset) =>
                  (offset ? (child.type === 'list' ? '\n' : '\n\n') : '') +
                  render(child)
              )
              .join('');
        return (checkbox + content)
          .split('\n')
          .map((line, offset) =>
            offset === 0
              ? marker + line
              : line
                ? ' '.repeat(marker.length) + line
                : ''
          )
          .join('\n');
      })
      .join('\n');
  const html = (value: string): string => {
    const doc = new DOMParser().parseFromString(value, 'text/html');
    return render({
      type: 'htmlContainer',
      children: Array.from(doc.body.childNodes).map(htmlNode),
    });
  };
  const htmlTable = (table: HTMLTableElement): string => {
    const rows = Array.from(table.rows);
    const grid: string[][] = rows.map(() => []);
    rows.forEach((row, rowIndex) => {
      let column = 0;
      for (const cell of Array.from(row.cells)) {
        while (grid[rowIndex][column] !== undefined) column += 1;
        const groupEnd = rows.findIndex(
          (candidate, index) =>
            index > rowIndex && candidate.parentElement !== row.parentElement
        );
        const remaining = (groupEnd === -1 ? rows.length : groupEnd) - rowIndex;
        const rowSpan = Math.min(cell.rowSpan || remaining, remaining);
        for (let y = 0; y < rowSpan; y += 1) {
          for (let x = 0; x < cell.colSpan; x += 1) {
            grid[rowIndex + y][column + x] = '';
          }
        }
        grid[rowIndex][column] = render({
          type: 'tableCell',
          children: Array.from(cell.childNodes).map(htmlNode),
        });
        column += cell.colSpan;
      }
    });
    const width = Math.max(0, ...grid.map(row => row.length));
    return grid
      .map(row =>
        Array.from({ length: width }, (_, i) => row[i] ?? '').join('\t')
      )
      .join('\n');
  };
  const htmlNode = (node: Node): MarkdownNode => {
    if (node.nodeType === 3)
      return { type: 'text', value: node.nodeValue ?? '' };
    if (node.nodeType !== 1) return { type: 'text', value: '' };
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    if (['script', 'style', 'template', 'noscript'].includes(tag))
      return { type: 'text', value: '' };
    if (tag === 'pre' || tag === 'code')
      return {
        type: tag === 'pre' ? 'code' : 'inlineCode',
        value: el.textContent ?? '',
      };
    if (tag === 'br') return { type: 'break' };
    if (tag === 'img')
      return {
        type: 'image',
        alt: el.getAttribute('alt') ?? '',
        url: el.getAttribute('src') ?? '',
      };
    if (tag === 'table')
      return { type: 'tableText', value: htmlTable(el as HTMLTableElement) };
    const children = Array.from(el.childNodes)
      .filter(
        child =>
          !(
            child.nodeType === 3 &&
            !child.nodeValue?.trim() &&
            ['table', 'thead', 'tbody', 'tfoot', 'tr', 'ul', 'ol'].includes(tag)
          )
      )
      .map(htmlNode);
    if (tag === 'a')
      return { type: 'link', url: el.getAttribute('href') ?? '', children };
    if (tag === 'ul' || tag === 'ol')
      return {
        type: 'list',
        ordered: tag === 'ol',
        start: Number(el.getAttribute('start')) || 1,
        children,
      };
    const types: Record<string, string> = {
      table: 'table',
      thead: 'table',
      tbody: 'table',
      tfoot: 'table',
      tr: 'tableRow',
      td: 'tableCell',
      th: 'tableCell',
      li: 'listItem',
      p: 'paragraph',
      div: 'htmlContainer',
      blockquote: 'blockquote',
    };
    return {
      type: types[tag] ?? (/^h[1-6]$/.test(tag) ? 'heading' : 'htmlInline'),
      children,
    };
  };
  function render(node: MarkdownNode): string {
    switch (node.type) {
      case 'htmlContainer': {
        const parts: { text: string; type: string }[] = [];
        let pending: MarkdownNode[] = [];
        const flush = () => {
          if (pending.length)
            parts.push({ text: inline(pending), type: 'inline' });
          pending = [];
        };
        for (const child of node.children ?? []) {
          if (
            [
              'text',
              'htmlInline',
              'link',
              'inlineCode',
              'break',
              'image',
            ].includes(child.type)
          )
            pending.push(child);
          else {
            flush();
            parts.push({ text: render(child), type: child.type });
          }
        }
        flush();
        return parts
          .filter(part => part.text)
          .map(
            (part, offset) =>
              (offset ? (part.type === 'list' ? '\n' : '\n\n') : '') + part.text
          )
          .join('');
      }
      case 'root':
      case 'blockquote':
      case 'listItem':
        return blocks(node.children);
      case 'paragraph':
      case 'heading':
      case 'strong':
      case 'emphasis':
      case 'delete':
      case 'htmlInline':
        return inline(node.children);
      case 'text':
      case 'inlineCode':
      case 'code':
      case 'tableText':
        return node.value ?? '';
      case 'break':
        return '\n';
      case 'list':
        return list(node);
      case 'link':
        return link(inline(node.children), node.url);
      case 'linkReference':
        return link(
          inline(node.children),
          definitions.get(node.identifier?.toUpperCase() ?? '')
        );
      case 'image':
      case 'imageReference':
        return link(
          node.alt ?? '',
          node.url ?? definitions.get(node.identifier?.toUpperCase() ?? '')
        );
      case 'table':
        return (node.children ?? []).map(render).join('\n');
      case 'tableRow':
        return (node.children ?? []).map(render).join('\t');
      case 'tableCell':
        return (node.children ?? []).some(child => child.type === 'paragraph')
          ? (node.children ?? []).map(render).join('\n')
          : inline(node.children);
      case 'html':
        return html(node.value ?? '');
      case 'definition':
      case 'thematicBreak':
        return '';
      default:
        return node.children ? blocks(node.children) : (node.value ?? '');
    }
  }
  return render(tree);
}

function removeStyleWrappers(source: string): string {
  const removed: Range[] = [];
  const visit = (node: MarkdownNode) => {
    if (['paragraph', 'heading', 'tableCell'].includes(node.type)) {
      const opened = new Map<string, Range[]>();
      let htmlDepth = 0;
      const collect = (child: MarkdownNode) => {
        if (child.type === 'html') {
          const tag = child.value ?? '';
          if (/^<\//.test(tag)) htmlDepth = Math.max(0, htmlDepth - 1);
          else if (
            /^<[a-z]/i.test(tag) &&
            !/^<(?:br|img|hr|input|wbr)\b/i.test(tag) &&
            !/\/>$/.test(tag)
          )
            htmlDepth += 1;
          return;
        }
        if (child.type === 'text' && htmlDepth === 0) {
          const start = child.position?.start.offset;
          const end = child.position?.end.offset;
          if (start === undefined || end === undefined) return;
          const marker =
            /\[\/(text-color|highlight)\]|\[(text-color|highlight)(?:\s+color=(?:"[^"\r\n]*"|'[^'\r\n]*'|[^"'\s\]]+))?\s*\]|(?<!=)==(?!=)/g;
          for (const match of source.slice(start, end).matchAll(marker)) {
            const offset = start + match.index!;
            let backslashes = 0;
            for (let i = offset - 1; i >= 0 && source[i] === '\\'; i -= 1)
              backslashes += 1;
            if (backslashes % 2) continue;
            const name = match[1] ?? match[2] ?? '==';
            const stack = opened.get(name) ?? [];
            const closing =
              Boolean(match[1]) ||
              (name === '==' &&
                stack.length > 0 &&
                /\S/.test(source[offset - 1] ?? ''));
            const range = { start: offset, end: offset + match[0].length };
            if (closing) {
              const opening = stack.pop();
              if (opening) removed.push(opening, range);
            } else if (name !== '==' || /\S/.test(source[range.end] ?? ''))
              stack.push(range);
            opened.set(name, stack);
          }
        }
        child.children?.forEach(collect);
      };
      node.children?.forEach(collect);
      return;
    }
    node.children?.forEach(visit);
  };
  visit(parse(source));
  let cursor = 0;
  const result: string[] = [];
  for (const range of removed.sort((a, b) => a.start - b.start)) {
    result.push(source.slice(cursor, range.start));
    cursor = range.end;
  }
  result.push(source.slice(cursor));
  return result.join('');
}
