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
  const textRanges: SourceRange[] = [];
  const protectedRanges: SourceRange[] = [];
  const htmlCode: Array<{ tag: string; start: number }> = [];
  const visit = (node: SyntaxNode) => {
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
      if (node.type === 'text') textRanges.push({ start, end });
    }
    node.children?.forEach(visit);
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
  const blocks: Array<{ range: SourceRange; styled: boolean }> = [];
  for (const match of source.matchAll(/^:::([\w-]*)([^\r\n]*)$/gm)) {
    const start = match.index;
    const end = start + match[0].length;
    if (!eligible(start, end)) continue;
    if (match[1]) {
      // Track other block types so their closing delimiters are not stolen.
      if (match[2].trimEnd().endsWith(':::')) continue;
      blocks.push({
        range: { start, end },
        styled:
          match[1] === 'block-style' &&
          /^(?:[ \t]+\{[^}]*\})?[ \t]*$/.test(match[2]),
      });
    } else if (!match[2].trim()) {
      const opening = blocks.pop();
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
