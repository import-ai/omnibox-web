/**
 * TipTap / many GFM editors serialize nested lists with 2 spaces per level.
 * Vditor's Lute engine follows a stricter CommonMark indent rule and flattens
 * those nests (e.g. `  1. child` under `1. parent` becomes a sibling).
 *
 * Rewrite 2-space nest levels to 4 spaces per level so Lute keeps hierarchy.
 * Detection is per list block: a block with a 2-space list item is expanded,
 * while neighboring 4-space blocks stay untouched.
 */
const LIST_ITEM_RE = /^(\s*)([-*+]|\d{1,9}[.)])(\s+)(.*)$/;
const FENCE_RE = /^(\s*)(`{3,}|~{3,})(.*)$/;

const SPACES_PER_LEVEL = 4;

type ParsedLine =
  | { kind: 'raw'; line: string }
  | {
      kind: 'list';
      line: string;
      indent: number;
      marker: string;
      gap: string;
      text: string;
    };

function expandTwoSpaceIndent(indent: number): number {
  if (indent === 0 || indent % 2 !== 0) {
    return indent;
  }
  return (indent / 2) * SPACES_PER_LEVEL;
}

function rewriteListBlock(block: ParsedLine[]): string[] {
  const hasTwoSpaceNest = block.some(
    item => item.kind === 'list' && item.indent === 2
  );
  if (!hasTwoSpaceNest) {
    return block.map(item => item.line);
  }

  return block.map(item => {
    if (item.kind !== 'list') {
      return item.line;
    }
    const nextIndent = expandTwoSpaceIndent(item.indent);
    if (nextIndent === item.indent) {
      return item.line;
    }
    return ' '.repeat(nextIndent) + item.marker + item.gap + item.text;
  });
}

export function normalizeListIndentForLute(markdown: string): string {
  if (!markdown) {
    return markdown;
  }

  const lines = markdown.split('\n');
  const output: string[] = [];

  let inFence = false;
  let fenceChar = '';
  let fenceLen = 0;
  let block: ParsedLine[] = [];

  const flushBlock = () => {
    if (block.length === 0) {
      return;
    }
    output.push(...rewriteListBlock(block));
    block = [];
  };

  for (const line of lines) {
    const fenceMatch = line.match(FENCE_RE);
    if (fenceMatch) {
      flushBlock();
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
      output.push(line);
      continue;
    }

    if (inFence) {
      flushBlock();
      output.push(line);
      continue;
    }

    const listMatch = line.match(LIST_ITEM_RE);
    if (listMatch) {
      block.push({
        kind: 'list',
        line,
        indent: listMatch[1].length,
        marker: listMatch[2],
        gap: listMatch[3],
        text: listMatch[4],
      });
      continue;
    }

    // Blank line ends the current list block so mixed styles stay independent.
    if (line.trim() === '') {
      flushBlock();
      output.push(line);
      continue;
    }

    // Keep non-list lines inside an open block (continuations) unexpanded.
    if (block.length > 0 && /^\s+/.test(line)) {
      block.push({ kind: 'raw', line });
      continue;
    }

    flushBlock();
    output.push(line);
  }

  flushBlock();
  return output.join('\n');
}
