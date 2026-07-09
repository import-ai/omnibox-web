import {
  type KeyboardEvent,
  type MutableRefObject,
  useLayoutEffect,
} from 'react';

import type { TextSelection } from './composerDocument';
import {
  type ComposerToolRange,
  selectionIntersectsToolRange,
  snapSelectionToToolBoundary,
  toolRangeAfterCaret,
  toolRangeBeforeCaret,
} from './composerToolTokens';

const minTextareaHeight = 60;
const maxTextareaHeight = 200;

export function getTextareaSelection(
  textarea: HTMLTextAreaElement
): TextSelection {
  return {
    start: textarea.selectionStart ?? textarea.value.length,
    end: textarea.selectionEnd ?? textarea.value.length,
  };
}

export function setTextareaSelection(
  textarea: HTMLTextAreaElement,
  selection: TextSelection
) {
  textarea.setSelectionRange(selection.start, selection.end);
}

export function syncOverlayScroll(
  textarea: HTMLTextAreaElement | null,
  overlay: HTMLDivElement | null
) {
  if (!textarea || !overlay) return;
  overlay.scrollTop = textarea.scrollTop;
  overlay.scrollLeft = textarea.scrollLeft;
}

export function resizeComposer(textarea: HTMLTextAreaElement | null) {
  if (!textarea) return;
  textarea.style.height = 'auto';
  const contentHeight = textarea.scrollHeight;
  const nextHeight = Math.min(
    maxTextareaHeight,
    Math.max(minTextareaHeight, contentHeight)
  );
  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY =
    contentHeight > maxTextareaHeight ? 'auto' : 'hidden';
}

export function useComposerTextareaLayout({
  displayText,
  overlayRef,
  pendingSelectionRef,
  selectionRef,
  textareaRef,
  toolRanges,
}: {
  displayText: string;
  overlayRef: MutableRefObject<HTMLDivElement | null>;
  pendingSelectionRef: MutableRefObject<TextSelection | null>;
  selectionRef: MutableRefObject<TextSelection>;
  textareaRef: MutableRefObject<HTMLTextAreaElement | null>;
  toolRanges: ComposerToolRange[];
}) {
  useLayoutEffect(() => {
    resizeComposer(textareaRef.current);
    syncOverlayScroll(textareaRef.current, overlayRef.current);
  }, [displayText, overlayRef, textareaRef, toolRanges]);

  useLayoutEffect(() => {
    const selection = pendingSelectionRef.current;
    const textarea = textareaRef.current;
    if (!selection || !textarea) return;

    pendingSelectionRef.current = null;
    textarea.focus();
    setTextareaSelection(textarea, selection);
    selectionRef.current = selection;
  }, [displayText, pendingSelectionRef, selectionRef, textareaRef]);
}

export function restoreRejectedToolEdit(
  textarea: HTMLTextAreaElement,
  displayText: string,
  toolRanges: ComposerToolRange[],
  selectionRef: MutableRefObject<TextSelection>
) {
  const selection = snapSelectionToToolBoundary(
    getTextareaSelection(textarea),
    toolRanges
  );
  textarea.value = displayText;
  setTextareaSelection(textarea, selection);
  selectionRef.current = selection;
}

export function handleAtomicToolKeyDown(
  event: KeyboardEvent<HTMLTextAreaElement>,
  toolRanges: ComposerToolRange[],
  selectionRef: MutableRefObject<TextSelection>
): boolean {
  const textarea = event.currentTarget;
  const selection = getTextareaSelection(textarea);
  const collapsed = selection.start === selection.end;

  if (!collapsed && selectionIntersectsToolRange(selection, toolRanges)) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return false;
    event.preventDefault();
    const nextSelection = snapSelectionToToolBoundary(selection, toolRanges);
    setTextareaSelection(textarea, nextSelection);
    selectionRef.current = nextSelection;
    return true;
  }

  if (!collapsed || event.metaKey || event.ctrlKey || event.altKey) {
    return false;
  }

  return handleCollapsedAtomicKey(event, toolRanges, selectionRef);
}

function handleCollapsedAtomicKey(
  event: KeyboardEvent<HTMLTextAreaElement>,
  toolRanges: ComposerToolRange[],
  selectionRef: MutableRefObject<TextSelection>
): boolean {
  const textarea = event.currentTarget;
  const position = getTextareaSelection(textarea).start;
  const before = toolRangeBeforeCaret(position, toolRanges);
  const after = toolRangeAfterCaret(position, toolRanges);

  if (event.key === 'ArrowLeft' && before) {
    event.preventDefault();
    return moveTextareaCaret(textarea, before.start, selectionRef);
  }
  if (event.key === 'ArrowRight' && after) {
    event.preventDefault();
    return moveTextareaCaret(textarea, after.end, selectionRef);
  }
  return false;
}

function moveTextareaCaret(
  textarea: HTMLTextAreaElement,
  position: number,
  selectionRef: MutableRefObject<TextSelection>
): true {
  const selection = { start: position, end: position };
  setTextareaSelection(textarea, selection);
  selectionRef.current = selection;
  return true;
}
