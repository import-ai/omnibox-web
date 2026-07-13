import type { ResourceMeta } from '@/interface';

import { snapSelectionToAtomicBoundary } from './composerAtomicRanges';
import {
  type ComposerMention,
  createResourceMentionText,
  deleteResourceMention,
  getResourceContextType,
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
  const existing = state.mentions.find(
    mention => mention.resource.id === resource.id
  );
  return existing
    ? replaceComposerResource(
        state,
        existing,
        resource,
        selection,
        untitledLabel
      )
    : insertNewComposerResource(state, resource, selection, untitledLabel);
}

function insertNewComposerResource(
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

/** Removes legacy duplicate resource tokens while preserving the first range. */
export function deduplicateComposerResources(
  state: ComposerState
): ComposerState {
  const seenResourceIds = new Set<string>();
  const duplicates = state.mentions.filter(mention => {
    const resourceId = mention.resource.id;
    if (seenResourceIds.has(resourceId)) return true;
    seenResourceIds.add(resourceId);
    return false;
  });

  return duplicates
    .sort((first, second) => second.start - first.start)
    .reduce(removeDuplicateMention, state);
}

function replaceComposerResource(
  state: ComposerState,
  mention: ComposerMention,
  resource: ResourceMeta,
  selection: TextSelection,
  untitledLabel: string
): ComposerOperationResult {
  const label = resource.name || untitledLabel;
  const tokenText = createResourceMentionText(label);
  const insertedLength = tokenText.length;
  const delta = insertedLength - (mention.end - mention.start);
  const displayText =
    state.displayText.slice(0, mention.start) +
    tokenText +
    state.displayText.slice(mention.end);
  const mentions = replaceMentionInList(
    state.mentions,
    mention,
    resource,
    label,
    insertedLength,
    delta
  );

  return {
    state: {
      displayText,
      mentions,
      toolRanges: shiftToolRangesForReplacement(
        state.toolRanges,
        mention,
        insertedLength
      ),
    },
    selection: shiftSelectionForReplacement(selection, mention, insertedLength),
  };
}

function replaceMentionInList(
  mentions: ComposerMention[],
  target: ComposerMention,
  resource: ResourceMeta,
  label: string,
  insertedLength: number,
  delta: number
): ComposerMention[] {
  return mentions.map(mention => {
    if (mention === target) {
      const type = getResourceContextType(resource);
      return {
        ...mention,
        id: `${resource.id}:${type}`,
        label,
        end: mention.start + insertedLength,
        type,
        resource,
      };
    }
    return mention.start >= target.end
      ? {
          ...mention,
          start: mention.start + delta,
          end: mention.end + delta,
        }
      : mention;
  });
}

function removeDuplicateMention(
  state: ComposerState,
  duplicate: ComposerMention
): ComposerState {
  const current = state.mentions.find(
    mention =>
      mention.resource.id === duplicate.resource.id &&
      mention.start === duplicate.start
  );
  if (!current) return state;
  const removed = deleteResourceMention(
    { text: state.displayText, mentions: state.mentions },
    { start: current.start, end: current.end },
    'Delete'
  );
  if (!removed) return state;
  return {
    displayText: removed.text,
    mentions: removed.mentions,
    toolRanges: shiftToolRangesForReplacement(state.toolRanges, current, 0),
  };
}

function shiftSelectionForReplacement(
  selection: TextSelection,
  range: TextSelection,
  insertedLength: number
): TextSelection {
  const delta = insertedLength - (range.end - range.start);
  const shiftPosition = (position: number) => {
    if (position <= range.start) return position;
    if (position >= range.end) return position + delta;
    return range.start + insertedLength;
  };
  return {
    start: shiftPosition(selection.start),
    end: shiftPosition(selection.end),
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
