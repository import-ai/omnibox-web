import type { MutableRefObject } from 'react';
import { useCallback } from 'react';

import type { TextSelection } from './composerDocument';
import type { ComposerState } from './composerState';
import { handleAtomicTokenKeyDown } from './composerTextarea';
import type { ToolType } from './types';
import { useComposerDeletionHandlers } from './useComposerDeletionHandlers';
import type { PublishComposerState } from './useComposerPublisher';

interface UseComposerInputHandlersParams {
  composerState: ComposerState;
  disabled: boolean;
  isComposing: boolean;
  onSend: () => void;
  onToolsChange: (value: ToolType[]) => void;
  publishComposerState: PublishComposerState;
  selectionRef: MutableRefObject<TextSelection>;
  tools: ToolType[];
}

/** Creates textarea handlers that preserve every atomic composer range. */
export function useComposerInputHandlers({
  composerState,
  disabled,
  isComposing,
  onSend,
  onToolsChange,
  publishComposerState,
  selectionRef,
  tools,
}: UseComposerInputHandlersParams) {
  const { displayText, mentions, toolRanges } = composerState;
  const handleDeletion = useComposerDeletionHandlers({
    displayText,
    mentions,
    onToolsChange,
    publishComposerState,
    toolRanges,
    tools,
  });
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (handleDeletion(event)) return;
      if (handleAtomicTokenKeyDown(event, mentions, toolRanges, selectionRef)) {
        return;
      }
      if (isComposing || event.key !== 'Enter' || event.shiftKey) return;

      event.preventDefault();
      if (event.metaKey || event.ctrlKey || event.altKey || disabled) return;
      onSend();
    },
    [
      disabled,
      handleDeletion,
      isComposing,
      mentions,
      onSend,
      selectionRef,
      toolRanges,
    ]
  );
  return handleKeyDown;
}
