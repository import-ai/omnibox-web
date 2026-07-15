import type { ComposerMention, TextSelection } from './composerDocument';
import type {
  ComposerToolDocument,
  ComposerToolRange,
  VisibleComposerTool,
} from './composerToolTokens';

interface ComposerSelectionDocument extends ComposerToolDocument {
  mentions: ComposerMention[];
}

interface DeleteComposerSelectionResult extends ComposerSelectionDocument {
  removedTools: VisibleComposerTool[];
  selection: TextSelection;
}

interface TextRange {
  start: number;
  end: number;
}

type AtomicRange = ComposerMention | ComposerToolRange;

/** Deletes a text selection while preserving atomic token boundaries. */
export function deleteComposerSelection(
  document: ComposerSelectionDocument,
  selection: TextSelection
): DeleteComposerSelectionResult | null {
  const initialRange = normalizeSelection(selection, document.text.length);
  if (initialRange.start === initialRange.end) return null;

  const range = expandRangeToAtomicTokens(initialRange, [
    ...document.mentions,
    ...document.tools,
  ]);
  const text =
    document.text.slice(0, range.start) + document.text.slice(range.end);
  const mentions = deleteAtomicRanges(document.mentions, range);
  const tools = deleteAtomicRanges(document.tools, range);
  const removedTools = document.tools
    .filter(tool => rangesOverlap(range, tool))
    .map(tool => tool.tool);

  return {
    text,
    mentions,
    tools,
    removedTools,
    selection: { start: range.start, end: range.start },
  };
}

function expandRangeToAtomicTokens(
  range: TextRange,
  atomicRanges: AtomicRange[]
): TextRange {
  let next = range;
  let changed = true;

  while (changed) {
    changed = false;
    atomicRanges.forEach(item => {
      if (!rangesOverlap(next, item)) return;
      const start = Math.min(next.start, item.start);
      const end = Math.max(next.end, item.end);
      changed ||= start !== next.start || end !== next.end;
      next = { start, end };
    });
  }

  return next;
}

function deleteAtomicRanges<T extends TextRange>(
  ranges: T[],
  deletedRange: TextRange
): T[] {
  const removedLength = deletedRange.end - deletedRange.start;
  return ranges
    .filter(range => !rangesOverlap(deletedRange, range))
    .map(range =>
      range.start >= deletedRange.end
        ? {
            ...range,
            start: range.start - removedLength,
            end: range.end - removedLength,
          }
        : range
    );
}

function rangesOverlap(first: TextRange, second: TextRange): boolean {
  return first.start < second.end && first.end > second.start;
}

function normalizeSelection(
  selection: TextSelection,
  length: number
): TextRange {
  const start = clamp(selection.start, 0, length);
  const end = clamp(selection.end, 0, length);
  return start <= end ? { start, end } : { start: end, end: start };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}
