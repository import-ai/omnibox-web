export const SCROLL_TO_BOTTOM_EVENT = 'scroll-to-bottom';

export interface ScrollToBottomContext {
  namespaceId: string;
  resourceId: string;
}

export function isScrollToBottomContextFor(
  context: unknown,
  target: ScrollToBottomContext
) {
  if (!context || typeof context !== 'object') return false;
  const value = context as Partial<ScrollToBottomContext>;
  return (
    value.namespaceId === target.namespaceId &&
    value.resourceId === target.resourceId
  );
}
