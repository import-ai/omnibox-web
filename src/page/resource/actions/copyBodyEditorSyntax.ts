import { parseAttributes } from '@tiptap/core';

type SourceRange = { start: number; end: number };
type SyntaxNode = {
  type: string;
  children?: SyntaxNode[];
  position?: { start: { offset?: number }; end: { offset?: number } };
};
type Edit = SourceRange & { value: string };

/** Recognize editor syntax only at unescaped Markdown text positions. */
export function normalizeCopyBodyEditorSyntax(
  source: string,
  tree: SyntaxNode
): string {
  const textRanges: Array<SourceRange & { container: number }> = [];
  let containerId = 0;
  const protectedRanges: SourceRange[] = [];
  const htmlCode: Array<{ tag: string; start: number }> = [];
  const visit = (node: SyntaxNode, container = 0) => {
    if (node.type === 'blockquote' || node.type === 'listItem')
      container = ++containerId;
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start !== undefined && end !== undefined) {
      if (node.type === 'html') {
        const token = source.slice(start, end);
        const opening = /^<(code|pre)\b/i.exec(token);
        const closing = /^<\/(code|pre)\s*>/i.exec(token);
        if (opening && !new RegExp(`</${opening[1]}\\s*>`, 'i').test(token))
          htmlCode.push({ tag: opening[1].toLowerCase(), start });
        if (
          closing &&
          htmlCode[htmlCode.length - 1]?.tag === closing[1].toLowerCase()
        ) {
          protectedRanges.push({ start: htmlCode.pop()!.start, end });
        }
      }
      if (node.type === 'link' && source[start] !== '[') {
        protectedRanges.push({ start, end });
        return;
      }
      if (['code', 'inlineCode', 'html'].includes(node.type)) {
        protectedRanges.push({ start, end });
        return;
      }
      if (node.type === 'text') textRanges.push({ start, end, container });
    }
    node.children?.forEach(child => visit(child, container));
  };
  visit(tree);
  htmlCode.forEach(({ start }) =>
    protectedRanges.push({ start, end: source.length })
  );
  const unescaped = (offset: number) => {
    let backslashes = 0;
    for (let i = offset - 1; i >= 0 && source[i] === '\\'; i -= 1)
      backslashes += 1;
    return backslashes % 2 === 0;
  };
  const eligible = (start: number, end: number) =>
    unescaped(start) &&
    textRanges.some(range => start >= range.start && start < range.end) &&
    !protectedRanges.some(range => start < range.end && end > range.start);
  const edits: Edit[] = [];
  const openingEnd = (end: number, prefix: string): number => {
    if (!/(?:[-+*]|\d+[.)])[ \t]/.test(prefix)) return end;
    const continuation = prefix.replace(/(?:[-+*]|\d+[.)])(?=[ \t])/g, marker =>
      ' '.repeat(marker.length)
    );
    let cursor = end;
    while (cursor < source.length) {
      const next = source.indexOf('\n', cursor);
      if (next === -1) break;
      const start = next + 1;
      const lineEnd = source.indexOf('\n', start);
      const line = source
        .slice(start, lineEnd === -1 ? source.length : lineEnd)
        .replace(/\r$/, '');
      if (/^(?:[ \t]*>[ \t]?)*[ \t]*$/.test(line)) {
        if (lineEnd === -1) break;
        cursor = lineEnd;
        continue;
      }
      // Keep the list marker attached to its first body block after removing the wrapper.
      return line.startsWith(continuation) ? start + continuation.length : end;
    }
    return end;
  };
  const blocks = new Map<
    number,
    Array<{ range: SourceRange; styled: boolean }>
  >();
  for (const match of source.matchAll(/:::([\w-]*)([^\r\n]*)$/gm)) {
    const start = match.index;
    const end = start + match[0].length;
    if (!eligible(start, end)) continue;
    const prefix = source.slice(source.lastIndexOf('\n', start - 1) + 1, start);
    if (!/^(?:(?:[ \t]*>[ \t]?)|[ \t]+|(?:[-+*]|\d+[.)])[ \t]+)*$/.test(prefix))
      continue;
    // Pair delimiters only inside their original Markdown container.
    const container = textRanges.find(
      range => start >= range.start && start < range.end
    )!.container;
    const stack = blocks.get(container) ?? [];
    blocks.set(container, stack);
    if (match[1]) {
      // Track other block types so their closing delimiters are not stolen.
      if (match[2].trimEnd().endsWith(':::')) continue;
      const styled =
        match[1] === 'block-style' &&
        /^(?:[ \t]+\{[^}]*\})?[ \t]*$/.test(match[2]);
      stack.push({
        range: { start, end: styled ? openingEnd(end, prefix) : end },
        styled,
      });
    } else if (!match[2].trim()) {
      const opening = stack.pop();
      if (opening?.styled)
        edits.push({ ...opening.range, value: '' }, { start, end, value: '' });
    }
  }
  for (const match of source.matchAll(/\[@\s+([^\]\r\n]*)\]/g)) {
    const start = match.index;
    const end = start + match[0].length;
    if (!eligible(start, end)) continue;
    const attrs = parseAttributes(match[1]);
    const label = attrs.label || attrs.id;
    if (typeof label !== 'string') continue;
    // A display name is literal text, even when it contains Markdown markers.
    const value = `@${label}`.replace(/[\\`*_[\]<>~^=&]/g, '\\$&');
    edits.push({ start, end, value });
  }
  for (const match of source.matchAll(
    /\^([^\^\r\n]+)\^|(?<!~)~(?!~)([^~\r\n]+)~(?!~)/g
  )) {
    const start = match.index;
    const end = start + match[0].length;
    if (
      !eligible(start, end) ||
      !unescaped(end - 1) ||
      edits.some(
        edit =>
          (start < edit.end && start + 1 > edit.start) ||
          (end - 1 < edit.end && end > edit.start)
      )
    )
      continue;
    edits.push(
      { start, end: start + 1, value: '' },
      { start: end - 1, end, value: '' }
    );
  }
  let cursor = 0;
  const result: string[] = [];
  for (const edit of edits.sort((a, b) => a.start - b.start || b.end - a.end)) {
    if (edit.start < cursor) continue;
    result.push(source.slice(cursor, edit.start), edit.value);
    cursor = edit.end;
  }
  return result.join('') + source.slice(cursor);
}
