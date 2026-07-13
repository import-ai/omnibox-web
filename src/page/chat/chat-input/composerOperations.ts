import type { ResourceMeta } from '@/interface';

import { snapSelectionToAtomicBoundary } from './composerAtomicRanges';
import {
  insertResourceMention,
  type TextSelection,
  updateMentionsForTextChange,
} from './composerDocument';
import type { ComposerState } from './composerState';
import {
  insertToolRange,
  isVisibleComposerTool,
  removeToolRange,
  shiftToolRangesForReplacement,
  updateToolRangesForTextChange,
  type VisibleComposerTool,
} from './composerToolTokens';
import { ToolType } from './types';

export interface ComposerOperationResult {
  selection: TextSelection;
  state: ComposerState;
}

export function insertComposerResource(
  state: ComposerState,
  resource: ResourceMeta,
  selection: TextSelection,
  untitledLabel: string
): ComposerOperationResult {
  const document = insertResourceMention(
    { text: state.displayText, mentions: state.mentions },
    resource,
    selection,
    untitledLabel
  );
  const insertedLength =
    document.selection.start - document.replacedRange.start;
  const toolRanges = shiftToolRangesForReplacement(
    state.toolRanges,
    document.replacedRange,
    insertedLength
  );

  return {
    state: {
      displayText: document.text,
      mentions: document.mentions,
      toolRanges,
    },
    selection: document.selection,
  };
}

export function toggleComposerTool(
  state: ComposerState,
  tool: ToolType,
  label: string,
  selection: TextSelection
): ComposerOperationResult | null {
  if (!isVisibleComposerTool(tool)) return null;
  const document = { text: state.displayText, tools: state.toolRanges };
  const existing = state.toolRanges.some(range => range.tool === tool);
  const result = existing
    ? removeToolRange(document, tool)
    : insertToolRange(document, tool, label, selection);
  const mentions = updateMentionsForTextChange(
    state.displayText,
    result.text,
    state.mentions
  );
  if (!mentions) return null;

  return {
    state: {
      displayText: result.text,
      mentions,
      toolRanges: result.tools,
    },
    selection: result.selection,
  };
}

export function applyComposerTextChange(
  state: ComposerState,
  nextText: string,
  selection: TextSelection
): ComposerOperationResult | null {
  const toolRanges = updateToolRangesForTextChange(
    state.displayText,
    nextText,
    state.toolRanges
  );
  const mentions = updateMentionsForTextChange(
    state.displayText,
    nextText,
    state.mentions
  );
  if (!toolRanges || !mentions) return null;

  return {
    state: { displayText: nextText, mentions, toolRanges },
    selection: snapSelectionToAtomicBoundary(selection, mentions, toolRanges),
  };
}

export function isComposerToolSelected(
  state: ComposerState,
  tool: VisibleComposerTool
): boolean {
  return state.toolRanges.some(range => range.tool === tool);
}
