import type { MutableRefObject } from 'react';
import { useCallback } from 'react';

import type { TextSelection } from './composerDocument';
import { applyComposerTextChange } from './composerOperations';
import type { ComposerState } from './composerState';
import {
  getTextareaSelection,
  restoreRejectedComposerEdit,
} from './composerTextarea';
import type { PublishComposerState } from './useComposerPublisher';

/** Applies ordinary textarea edits without allowing atomic token corruption. */
export function useComposerTextChange(
  composerState: ComposerState,
  publishComposerState: PublishComposerState,
  selectionRef: MutableRefObject<TextSelection>
) {
  const { displayText, mentions, toolRanges } = composerState;
  return useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const result = applyComposerTextChange(
        composerState,
        event.target.value,
        getTextareaSelection(event.target)
      );
      if (!result) {
        restoreRejectedComposerEdit(
          event.target,
          displayText,
          mentions,
          toolRanges,
          selectionRef
        );
        return;
      }
      publishComposerState(result.state, result.selection);
    },
    [
      composerState,
      displayText,
      mentions,
      publishComposerState,
      selectionRef,
      toolRanges,
    ]
  );
}
