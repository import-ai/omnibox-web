import type { TextSelection } from './composerDocument';
import {
  getTextChange,
  normalizeSelection,
  type TextChange,
} from './composerTextRanges';
import { ToolType } from './types';

export type VisibleComposerTool = Exclude<ToolType, ToolType.PRIVATE_SEARCH>;

export interface ComposerToolRange {
  tool: VisibleComposerTool;
  label: string;
  start: number;
  end: number;
}

export interface ComposerToolDocument {
  text: string;
  tools: ComposerToolRange[];
}

export interface ComposerToolEditResult extends ComposerToolDocument {
  selection: TextSelection;
}

export interface ComposerToolDeletionResult extends ComposerToolEditResult {
  tool: VisibleComposerTool;
}

export const toolTokenSpacer = '\u2007\u2007\u2007';

export function isVisibleComposerTool(
  tool: ToolType
): tool is VisibleComposerTool {
  return tool !== ToolType.PRIVATE_SEARCH;
}

export function createToolTokenText(label: string): string {
  return `${toolTokenSpacer}${label}`;
}

export function sameToolRanges(
  first: ComposerToolRange[],
  second: ComposerToolRange[]
): boolean {
  if (first.length !== second.length) return false;
  return first.every((range, index) => {
    const other = second[index];
    return (
      range.tool === other.tool &&
      range.label === other.label &&
      range.start === other.start &&
      range.end === other.end
    );
  });
}

export function insertToolRange(
  document: ComposerToolDocument,
  tool: VisibleComposerTool,
  label: string,
  selection: TextSelection
): ComposerToolEditResult {
  if (document.tools.some(range => range.tool === tool)) {
    return {
      ...document,
      selection: snapSelectionToToolBoundary(selection, document.tools),
    };
  }

  const range = normalizeSelection(selection, document.text.length);
  if (selectionIntersectsToolRange(range, document.tools)) {
    return {
      ...document,
      selection: snapSelectionToToolBoundary(range, document.tools),
    };
  }

  const tokenText = createToolTokenText(label);
  const replacedRange = {
    start: range.start,
    end: range.end + (document.text[range.end] === ' ' ? 1 : 0),
  };
  const replacementText = `${tokenText} `;
  const text =
    document.text.slice(0, replacedRange.start) +
    replacementText +
    document.text.slice(replacedRange.end);
  const shiftedTools = shiftToolRangesForReplacement(
    document.tools,
    replacedRange,
    replacementText.length
  );
  const start = replacedRange.start;

  return {
    text,
    tools: [
      ...shiftedTools,
      { tool, label, start, end: start + tokenText.length },
    ].sort((a, b) => a.start - b.start),
    selection: {
      start: start + replacementText.length,
      end: start + replacementText.length,
    },
  };
}

export function removeToolRange(
  document: ComposerToolDocument,
  tool: VisibleComposerTool
): ComposerToolEditResult {
  const range = document.tools.find(item => item.tool === tool);
  if (!range) {
    const end = document.text.length;
    return { ...document, selection: { start: end, end } };
  }

  const text =
    document.text.slice(0, range.start) + document.text.slice(range.end);
  const removedLength = range.end - range.start;
  const tools = document.tools
    .filter(item => item !== range)
    .map(item =>
      item.start > range.start
        ? {
            ...item,
            start: item.start - removedLength,
            end: item.end - removedLength,
          }
        : item
    );

  return {
    text,
    tools,
    selection: { start: range.start, end: range.start },
  };
}

export function deleteToolRange(
  document: ComposerToolDocument,
  selection: TextSelection,
  key: string
): ComposerToolDeletionResult | null {
  const target = toolRangeForDeletion(selection, key, document.tools);
  if (!target) return null;

  return {
    ...removeToolRange(document, target.tool),
    tool: target.tool,
  };
}

export function updateToolRangesForTextChange(
  previousText: string,
  nextText: string,
  tools: ComposerToolRange[]
): ComposerToolRange[] | null {
  const change = getTextChange(previousText, nextText);
  const shifted: ComposerToolRange[] = [];

  for (const range of tools) {
    const nextRange = shiftToolRange(range, change, nextText);
    if (!nextRange) return null;
    shifted.push(nextRange);
  }

  return shifted.sort((a, b) => a.start - b.start);
}

export function selectionIntersectsToolRange(
  selection: TextSelection,
  tools: ComposerToolRange[]
): boolean {
  const range = normalizeSelection(selection, Number.MAX_SAFE_INTEGER);
  return tools.some(tool => {
    if (range.start === range.end) {
      return range.start > tool.start && range.start < tool.end;
    }
    return range.start < tool.end && range.end > tool.start;
  });
}

export function toolRangeForDeletion(
  selection: TextSelection,
  key: string,
  tools: ComposerToolRange[]
): ComposerToolRange | undefined {
  if (key !== 'Backspace' && key !== 'Delete') return undefined;

  if (selection.start !== selection.end) {
    return tools.find(range => selectionOverlapsRange(selection, range));
  }

  if (key === 'Backspace') return toolRangeBeforeCaret(selection.start, tools);
  return toolRangeAfterCaret(selection.start, tools);
}

export function snapSelectionToToolBoundary(
  selection: TextSelection,
  tools: ComposerToolRange[]
): TextSelection {
  if (selection.start !== selection.end) {
    return snapExpandedSelection(selection, tools);
  }

  const position = selection.start;
  const range = tools.find(
    item => position > item.start && position < item.end
  );
  if (!range) return selection;

  const nearStart = position - range.start <= range.end - position;
  const nextPosition = nearStart ? range.start : range.end;
  return { start: nextPosition, end: nextPosition };
}

export function toolRangeBeforeCaret(
  position: number,
  tools: ComposerToolRange[]
): ComposerToolRange | undefined {
  return tools.find(range => position > range.start && position <= range.end);
}

export function toolRangeAfterCaret(
  position: number,
  tools: ComposerToolRange[]
): ComposerToolRange | undefined {
  return tools.find(range => position >= range.start && position < range.end);
}

function selectionOverlapsRange(
  selection: TextSelection,
  range: ComposerToolRange
): boolean {
  const start = Math.min(selection.start, selection.end);
  const end = Math.max(selection.start, selection.end);
  return start < range.end && end > range.start;
}

function snapExpandedSelection(
  selection: TextSelection,
  tools: ComposerToolRange[]
): TextSelection {
  let start = Math.min(selection.start, selection.end);
  let end = Math.max(selection.start, selection.end);

  tools.forEach(range => {
    if (start > range.start && start < range.end) start = range.start;
    if (end > range.start && end < range.end) end = range.end;
  });

  return selection.start <= selection.end
    ? { start, end }
    : { start: end, end: start };
}

function shiftToolRange(
  range: ComposerToolRange,
  change: TextChange,
  nextText: string
): ComposerToolRange | null {
  if (range.end <= change.start) return validateToolRange(range, nextText);
  if (range.start >= change.end) {
    return validateToolRange(
      {
        ...range,
        start: range.start + change.delta,
        end: range.end + change.delta,
      },
      nextText
    );
  }
  return null;
}

function validateToolRange(
  range: ComposerToolRange,
  text: string
): ComposerToolRange | null {
  return isToolRangeValid(text, range) ? range : null;
}

function isToolRangeValid(text: string, range: ComposerToolRange): boolean {
  return (
    text.slice(range.start, range.end) === createToolTokenText(range.label)
  );
}

export function shiftToolRangesForReplacement(
  tools: ComposerToolRange[],
  range: TextSelection,
  insertedLength: number
): ComposerToolRange[] {
  const normalizedRange = normalizeSelection(range, Number.MAX_SAFE_INTEGER);
  const removedLength = normalizedRange.end - normalizedRange.start;
  const delta = insertedLength - removedLength;

  return tools.map(item =>
    item.start >= normalizedRange.end
      ? {
          ...item,
          start: item.start + delta,
          end: item.end + delta,
        }
      : item
  );
}
