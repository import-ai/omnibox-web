interface CommentRange {
  from: number;
  to: number;
}

export interface CommentCardBounds {
  range: CommentRange | null;
  anchorTop?: number;
  top: number;
  bottom: number;
}

interface CommentDraftPosition {
  top: number;
  cardOffsets: number[];
}

const COMMENT_GAP = 8;

export function getCommentDraftPosition(
  selection: CommentRange,
  selectionTop: number,
  cards: readonly CommentCardBounds[],
  draftHeight: number
): CommentDraftPosition {
  const ordered = cards
    .map((card, index) => ({ ...card, index }))
    .sort((left, right) => {
      if (left.range && right.range) {
        return left.range.from - right.range.from || left.top - right.top;
      }
      return (left.anchorTop ?? left.top) - (right.anchorTop ?? right.top);
    });
  const precedesDraft = (card: CommentCardBounds) =>
    card.range ? card.range.from < selection.to : card.top < selectionTop;
  const before = ordered.filter(precedesDraft);
  const after = ordered.filter(card => !precedesDraft(card));
  const cardOffsets = cards.map(() => 0);

  let nextTop = selectionTop;
  for (const card of before.reverse()) {
    const height = card.bottom - card.top;
    const top = Math.min(
      card.anchorTop ?? card.top,
      nextTop - COMMENT_GAP - height
    );
    cardOffsets[card.index] = top - card.top;
    nextTop = top;
  }

  let previousBottom = selectionTop + draftHeight;
  for (const card of after) {
    const top = Math.max(
      card.anchorTop ?? card.top,
      previousBottom + COMMENT_GAP
    );
    cardOffsets[card.index] = top - card.top;
    previousBottom = top + card.bottom - card.top;
  }

  return { top: selectionTop, cardOffsets };
}
