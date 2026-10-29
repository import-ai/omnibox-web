export type CommentViewportPlacement = 'above' | 'visible' | 'below';

// Compares a comment card with the comment panel's visible window.
// A card still hidden while its top is being measured is not placed.
export function commentViewportPlacement(
  card: Pick<DOMRect, 'top' | 'bottom'>,
  viewTop: number,
  viewBottom: number
): CommentViewportPlacement {
  const slack = 1;
  if (card.top >= viewBottom - slack) {
    return 'below';
  }
  if (card.bottom <= viewTop + slack) {
    return 'above';
  }
  return 'visible';
}
