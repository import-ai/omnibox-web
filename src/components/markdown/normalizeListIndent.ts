/**
 * TipTap / many GFM editors serialize nested lists with 2 spaces per level.
 * Vditor's Lute engine follows a stricter CommonMark indent rule and flattens
 * those nests (e.g. `  1. child` under `1. parent` becomes a sibling).
 *
 * When a document uses 2-space nest levels, rewrite them to 4 spaces per level
 * so Lute keeps the hierarchy. Documents that already use 3+ space indents and
 * never emit a 2-space list item are left unchanged.
 */
const LIST_ITEM_RE = /^(\s*)([-*+]|\d{1,9}[.)])(\s+)(.*)$/;
const FENCE_RE = /^(\s*)(`{3,}|~{3,})(.*)$/;

const SPACES_PER_LEVEL = 4;

export function normalizeListIndentForLute(markdown: string): string {
  if (!markdown) {
    return markdown;
  }

  const lines = markdown.split('\n');
  const parsed: Array<
    | { kind: 'raw'; line: string }
    | {
        kind: 'list';
        line: string;
        indent: number;
        marker: string;
        gap: string;
        text: string;
      }
  > = [];

  let inFence = false;
  let fenceChar = '';
  let fenceLen = 0;
  let hasTwoSpaceNest = false;

  for (const line of lines) {
    const fenceMatch = line.match(FENCE_RE);
    if (fenceMatch) {
      const marker = fenceMatch[2];
      const char = marker[0];
      const len = marker.length;
      const info = (fenceMatch[3] || '').trim();
      if (!inFence) {
        inFence = true;
        fenceChar = char;
        fenceLen = len;
      } else if (char === fenceChar && len >= fenceLen && info === '') {
        inFence = false;
        fenceChar = '';
        fenceLen = 0;
      }
      parsed.push({ kind: 'raw', line });
      continue;
    }

    if (inFence) {
      parsed.push({ kind: 'raw', line });
      continue;
    }

    const listMatch = line.match(LIST_ITEM_RE);
    if (!listMatch) {
      parsed.push({ kind: 'raw', line });
      continue;
    }

    const indent = listMatch[1].length;
    if (indent === 2) {
      hasTwoSpaceNest = true;
    }
    parsed.push({
      kind: 'list',
      line,
      indent,
      marker: listMatch[2],
      gap: listMatch[3],
      text: listMatch[4],
    });
  }

  if (!hasTwoSpaceNest) {
    return markdown;
  }

  return parsed
    .map(item => {
      if (item.kind === 'raw') {
        return item.line;
      }
      if (item.indent === 0 || item.indent % 2 !== 0) {
        return item.line;
      }
      const level = item.indent / 2;
      return (
        ' '.repeat(level * SPACES_PER_LEVEL) +
        item.marker +
        item.gap +
        item.text
      );
    })
    .join('\n');
}
