const BOTTOM_PIN_THRESHOLD = 16;

interface SavedScroll {
  element: HTMLElement;
  top: number;
  pinToBottom: boolean;
}

function savedScroll(element: HTMLElement): SavedScroll {
  const distanceFromBottom =
    element.scrollHeight - element.scrollTop - element.clientHeight;
  return {
    element,
    top: element.scrollTop,
    pinToBottom: distanceFromBottom <= BOTTOM_PIN_THRESHOLD,
  };
}

/**
 * Measuring a textarea requires shrinking it first. That collapse clamps every
 * scrolled ancestor back to the top, so put the scroll positions back after
 * the measurement. A scroller already at the end stays at the end when the
 * text grows.
 */
export function withAncestorScrollPreserved(
  element: HTMLElement,
  mutate: () => void
) {
  const saved: SavedScroll[] = [];
  let parent = element.parentElement;
  while (parent) {
    if (parent.scrollHeight - parent.clientHeight > 1) {
      saved.push(savedScroll(parent));
    }
    parent = parent.parentElement;
  }
  const ownScroll = element.scrollTop;
  mutate();
  element.scrollTop = ownScroll;
  saved.forEach(item => {
    item.element.scrollTop = item.pinToBottom
      ? item.element.scrollHeight
      : item.top;
  });
}
