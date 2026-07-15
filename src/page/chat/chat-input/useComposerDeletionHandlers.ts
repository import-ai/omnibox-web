import type { KeyboardEvent } from 'react';
import { useCallback } from 'react';

import {
  type ComposerMention,
  deleteResourceMention,
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
import type { PublishComposerState } from './useComposerPublisher';

interface UseComposerDeletionHandlersParams {
  displayText: string;
  mentions: ComposerMention[];
  onToolsChange: (value: ToolType[]) => void;
  publishComposerState: PublishComposerState;
  toolRanges: ComposerToolRange[];
  tools: ToolType[];
}

export function useComposerDeletionHandlers(
  params: UseComposerDeletionHandlersParams
) {
  const deleteSelectedRange = useDeleteSelectedRange(params);
  const deleteResourceAtSelection = useDeleteResourceAtSelection(params);
  const deleteToolAtSelection = useDeleteToolAtSelection(params);

  return useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) =>
      deleteSelectedRange(event) ||
      deleteResourceAtSelection(event) ||
      deleteToolAtSelection(event),
    [deleteResourceAtSelection, deleteSelectedRange, deleteToolAtSelection]
  );
}

function useDeleteSelectedRange({
  displayText,
  mentions,
  onToolsChange,
  publishComposerState,
  toolRanges,
  tools,
}: UseComposerDeletionHandlersParams) {
  return useCallback(
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
        {
          displayText: result.text,
          mentions: result.mentions,
          toolRanges: result.tools,
        },
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
}

function useDeleteResourceAtSelection({
  displayText,
  mentions,
  publishComposerState,
  toolRanges,
}: UseComposerDeletionHandlersParams) {
  return useCallback(
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
        {
          displayText: result.text,
          mentions: result.mentions,
          toolRanges: nextToolRanges,
        },
        result.selection
      );
      return true;
    },
    [displayText, mentions, publishComposerState, toolRanges]
  );
}

function useDeleteToolAtSelection({
  displayText,
  mentions,
  onToolsChange,
  publishComposerState,
  toolRanges,
  tools,
}: UseComposerDeletionHandlersParams) {
  return useCallback(
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
      if (!nextMentions) return false;
      publishComposerState(
        {
          displayText: result.text,
          mentions: nextMentions,
          toolRanges: result.tools,
        },
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
