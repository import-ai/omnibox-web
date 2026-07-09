import type { KeyboardEvent } from 'react';
import { useCallback } from 'react';

import {
  type ComposerMention,
  deleteResourceMention,
  type TextSelection,
  updateMentionsForTextChange,
} from './composerDocument';
import { deleteComposerSelection } from './composerSelection';
import { getTextareaSelection } from './composerTextarea';
import {
  type ComposerToolRange,
  deleteToolRange,
  updateToolRangesForTextChange,
} from './composerToolTokens';
import type { ToolType } from './types';

type PublishComposerState = (
  nextText: string,
  nextMentions: ComposerMention[],
  nextToolRanges: ComposerToolRange[],
  selection?: TextSelection
) => void;

interface UseComposerDeletionHandlersParams {
  displayText: string;
  mentions: ComposerMention[];
  onToolsChange: (value: ToolType[]) => void;
  publishComposerState: PublishComposerState;
  toolRanges: ComposerToolRange[];
  tools: ToolType[];
}

export function useComposerDeletionHandlers({
  displayText,
  mentions,
  onToolsChange,
  publishComposerState,
  toolRanges,
  tools,
}: UseComposerDeletionHandlersParams) {
  const deleteSelectedRange = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (!isPlainDeletionKey(event)) return false;
      const selection = getTextareaSelection(event.currentTarget);
      if (selection.start === selection.end) return false;

      const result = deleteComposerSelection(
        { text: displayText, mentions, tools: toolRanges },
        selection
      );
      if (!result) return false;

      event.preventDefault();
      publishComposerState(
        result.text,
        result.mentions,
        result.tools,
        result.selection
      );
      if (result.removedTools.length > 0) {
        const removedTools = new Set<ToolType>(result.removedTools);
        onToolsChange(tools.filter(tool => !removedTools.has(tool)));
      }
      return true;
    },
    [
      displayText,
      mentions,
      onToolsChange,
      publishComposerState,
      toolRanges,
      tools,
    ]
  );

  const deleteResourceAtSelection = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (!isPlainDeletionKey(event)) return false;
      const result = deleteResourceMention(
        { text: displayText, mentions },
        getTextareaSelection(event.currentTarget),
        event.key
      );
      if (!result) return false;

      const nextToolRanges = updateToolRangesForTextChange(
        displayText,
        result.text,
        toolRanges
      );
      if (!nextToolRanges) return false;

      event.preventDefault();
      publishComposerState(
        result.text,
        result.mentions,
        nextToolRanges,
        result.selection
      );
      return true;
    },
    [displayText, mentions, publishComposerState, toolRanges]
  );

  const deleteToolAtSelection = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (!isPlainDeletionKey(event)) return false;
      const result = deleteToolRange(
        { text: displayText, tools: toolRanges },
        getTextareaSelection(event.currentTarget),
        event.key
      );
      if (!result) return false;

      event.preventDefault();
      const nextMentions = updateMentionsForTextChange(
        displayText,
        result.text,
        mentions
      );
      publishComposerState(
        result.text,
        nextMentions,
        result.tools,
        result.selection
      );
      onToolsChange(tools.filter(tool => tool !== result.tool));
      return true;
    },
    [
      displayText,
      mentions,
      onToolsChange,
      publishComposerState,
      toolRanges,
      tools,
    ]
  );

  return useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) =>
      deleteSelectedRange(event) ||
      deleteResourceAtSelection(event) ||
      deleteToolAtSelection(event),
    [deleteResourceAtSelection, deleteSelectedRange, deleteToolAtSelection]
  );
}

function isPlainDeletionKey(
  event: KeyboardEvent<HTMLTextAreaElement>
): boolean {
  return (
    (event.key === 'Backspace' || event.key === 'Delete') &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey
  );
}
