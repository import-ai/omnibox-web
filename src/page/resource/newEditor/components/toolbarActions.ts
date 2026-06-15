import { TextSelection } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/react';

export type InsertEmptyParagraphPosition = 'before' | 'after';

export interface InsertEmptyParagraphRange {
  insertAt: number;
  selectionAt: number;
}

export function getInsertEmptyParagraphRange(
  selectionDepth: number,
  selectionFrom: number,
  selectionTo: number,
  before: (depth: number) => number,
  after: (depth: number) => number,
  paragraphNodeSize: number,
  position: InsertEmptyParagraphPosition
): InsertEmptyParagraphRange {
  const blockDepth = selectionDepth;
  const insertAt =
    blockDepth > 0
      ? position === 'before'
        ? before(blockDepth)
        : after(blockDepth)
      : position === 'before'
        ? selectionFrom
        : selectionTo;

  return {
    insertAt,
    selectionAt:
      position === 'before' ? insertAt + 1 : insertAt + paragraphNodeSize - 1,
  };
}

export function insertEmptyParagraph(
  editor: Editor,
  position: InsertEmptyParagraphPosition
) {
  const { state, view } = editor;
  const { $from, from, to } = state.selection;
  const paragraph = state.schema.nodes.paragraph.create();
  const { insertAt, selectionAt } = getInsertEmptyParagraphRange(
    $from.depth,
    from,
    to,
    depth => $from.before(depth),
    depth => $from.after(depth),
    paragraph.nodeSize,
    position
  );
  const transaction = state.tr.insert(insertAt, paragraph);

  transaction.setSelection(TextSelection.create(transaction.doc, selectionAt));
  view.dispatch(transaction.scrollIntoView());
  view.focus();
}
