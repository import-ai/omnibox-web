const PANEL_MARGIN = 8;

function lineHeightOf(input: HTMLTextAreaElement) {
  const parsed = Number.parseFloat(getComputedStyle(input).lineHeight);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  const fontSize = Number.parseFloat(getComputedStyle(input).fontSize);
  return Number.isFinite(fontSize) && fontSize > 0 ? fontSize * 1.2 : 20;
}

/**
 * Move the caret to the end of a comment being edited.
 * The field grows with the full comment, and focus must not scroll the page,
 * so a long comment leaves the caret below the comments panel until that
 * panel is moved to the last line.
 */
export function placeCommentCaretAtEnd(input: HTMLTextAreaElement) {
  const end = input.value.length;
  input.setSelectionRange(end, end);
  input.scrollTop = input.scrollHeight;

  const scroller = input.closest<HTMLElement>('[data-comments-scroll]');
  if (!scroller) {
    return;
  }

  const scrollerRect = scroller.getBoundingClientRect();
  const inputRect = input.getBoundingClientRect();
  const visibleBottom = scrollerRect.bottom - PANEL_MARGIN;
  const visibleTop = scrollerRect.top + PANEL_MARGIN;
  const composer = input.closest<HTMLElement>(
    '.omnibox-comment-composer--edit'
  );
  const buttonsBottom =
    composer?.getBoundingClientRect().bottom ?? inputRect.bottom;
  const caretTop = inputRect.bottom - lineHeightOf(input);

  let delta = buttonsBottom - visibleBottom;
  const maxDelta = caretTop - visibleTop;
  if (delta > maxDelta) {
    delta = maxDelta;
  }
  if (delta < 0) {
    delta = caretTop < visibleTop ? caretTop - visibleTop : 0;
  }
  if (delta !== 0) {
    scroller.scrollTop += delta;
  }
}
