import { useCallback, useRef } from 'react';

import {
  getRememberedComposerSelection,
  selectionIntersectsAtomicRange,
  snapSelectionToAtomicBoundary,
} from './composerAtomicRanges';
import type { ComposerMention, TextSelection } from './composerDocument';
import { getTextareaSelection, setTextareaSelection } from './composerTextarea';
import type { ComposerToolRange } from './composerToolTokens';

/** Owns the stable textarea insertion anchor across toolbar focus changes. */
export function useComposerSelection(
  initialPosition: number,
  mentions: ComposerMention[],
  toolRanges: ComposerToolRange[]
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectionRef = useRef<TextSelection>({
    start: initialPosition,
    end: initialPosition,
  });
  const pendingSelectionRef = useRef<TextSelection | null>(null);

  const rememberSelection = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const selection = getRememberedComposerSelection({
      domSelection: getTextareaSelection(textarea),
      isTextareaActive:
        typeof document !== 'undefined' && document.activeElement === textarea,
      mentions,
      rememberedSelection: selectionRef.current,
      toolRanges,
    });
    selectionRef.current = selection;
    if (
      selection.start !== textarea.selectionStart ||
      selection.end !== textarea.selectionEnd
    ) {
      setTextareaSelection(textarea, selection);
    }
  }, [mentions, toolRanges]);

  const safeInsertionSelection = useCallback(() => {
    const selection = selectionRef.current;
    if (!selectionIntersectsAtomicRange(selection, mentions, toolRanges)) {
      return snapSelectionToAtomicBoundary(selection, mentions, toolRanges);
    }
    return snapSelectionToAtomicBoundary(
      { start: selection.end, end: selection.end },
      mentions,
      toolRanges
    );
  }, [mentions, toolRanges]);

  const commitSelection = useCallback((selection: TextSelection) => {
    selectionRef.current = selection;
    pendingSelectionRef.current = selection;
  }, []);

  return {
    commitSelection,
    pendingSelectionRef,
    rememberSelection,
    safeInsertionSelection,
    selectionRef,
    textareaRef,
  };
}
