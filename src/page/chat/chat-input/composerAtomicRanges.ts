import type { ComposerMention, TextSelection } from './composerDocument';
import type { ComposerToolRange } from './composerToolTokens';

interface AtomicRange {
  start: number;
  end: number;
}

interface RememberedSelectionParams {
  domSelection: TextSelection;
  isTextareaActive: boolean;
  mentions: ComposerMention[];
  rememberedSelection: TextSelection;
  toolRanges: ComposerToolRange[];
}

function atomicRanges(
  mentions: ComposerMention[],
  toolRanges: ComposerToolRange[]
): AtomicRange[] {
  return [...mentions, ...toolRanges].sort((a, b) => a.start - b.start);
}

export function selectionIntersectsAtomicRange(
  selection: TextSelection,
  mentions: ComposerMention[],
  toolRanges: ComposerToolRange[]
): boolean {
  const start = Math.min(selection.start, selection.end);
  const end = Math.max(selection.start, selection.end);

  return atomicRanges(mentions, toolRanges).some(range => {
    if (start === end) return start > range.start && start < range.end;
    return start < range.end && end > range.start;
  });
}

export function snapSelectionToAtomicBoundary(
  selection: TextSelection,
  mentions: ComposerMention[],
  toolRanges: ComposerToolRange[]
): TextSelection {
  const ranges = atomicRanges(mentions, toolRanges);
  if (selection.start !== selection.end) {
    return expandSelectionToAtomicBoundaries(selection, ranges);
  }

  const position = selection.start;
  const range = ranges.find(
    item => position > item.start && position < item.end
  );
  if (!range) return selection;

  const nearStart = position - range.start <= range.end - position;
  const nextPosition = nearStart ? range.start : range.end;
  return { start: nextPosition, end: nextPosition };
}

export function getRememberedComposerSelection({
  domSelection,
  isTextareaActive,
  mentions,
  rememberedSelection,
  toolRanges,
}: RememberedSelectionParams): TextSelection {
  if (!isTextareaActive) return rememberedSelection;
  return snapSelectionToAtomicBoundary(domSelection, mentions, toolRanges);
}

export function atomicRangeBeforeCaret(
  position: number,
  mentions: ComposerMention[],
  toolRanges: ComposerToolRange[]
): AtomicRange | undefined {
  return atomicRanges(mentions, toolRanges).find(
    range => position > range.start && position <= range.end
  );
}

export function atomicRangeAfterCaret(
  position: number,
  mentions: ComposerMention[],
  toolRanges: ComposerToolRange[]
): AtomicRange | undefined {
  return atomicRanges(mentions, toolRanges).find(
    range => position >= range.start && position < range.end
  );
}

function expandSelectionToAtomicBoundaries(
  selection: TextSelection,
  ranges: AtomicRange[]
): TextSelection {
  let start = Math.min(selection.start, selection.end);
  let end = Math.max(selection.start, selection.end);
  let changed = true;

  while (changed) {
    changed = false;
    ranges.forEach(range => {
      if (start >= range.end || end <= range.start) return;
      const nextStart = Math.min(start, range.start);
      const nextEnd = Math.max(end, range.end);
      changed ||= nextStart !== start || nextEnd !== end;
      start = nextStart;
      end = nextEnd;
    });
  }

  return selection.start <= selection.end
    ? { start, end }
    : { start: end, end: start };
}
