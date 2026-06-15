import type { EditorState, Transaction } from '@tiptap/pm/state';
import { Plugin } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/react';
import { Extension } from '@tiptap/react';

type DeleteDirection = 'backward' | 'forward';

interface EmptyParagraphPosition {
  end: number;
  index: number;
  start: number;
}

export interface AdjacentTableDeleteRange {
  from: number;
  to: number;
}

export function createTableEditableEdgesTransaction(
  state: EditorState
): Transaction | null {
  const paragraphType = state.schema.nodes.paragraph;
  const tableType = state.schema.nodes.table;

  if (!paragraphType || !tableType) {
    return null;
  }

  let positionOffset = 0;
  const transaction = state.tr;

  state.doc.forEach((node, position, index) => {
    if (node.type !== tableType) {
      return;
    }

    if (index === 0) {
      const paragraph = paragraphType.create();

      transaction.insert(position + positionOffset, paragraph);
      positionOffset += paragraph.nodeSize;
    }

    const nextNode =
      index < state.doc.childCount - 1 ? state.doc.child(index + 1) : null;

    if (!nextNode || nextNode.type === tableType) {
      const paragraph = paragraphType.create();

      transaction.insert(position + positionOffset + node.nodeSize, paragraph);
      positionOffset += paragraph.nodeSize;
    }
  });

  return transaction.docChanged ? transaction : null;
}

function getEmptyTopLevelParagraphPosition(
  state: EditorState
): EmptyParagraphPosition | null {
  const { selection } = state;
  const { $from } = selection;

  if (
    !selection.empty ||
    $from.depth !== 1 ||
    $from.parent.type !== state.schema.nodes.paragraph ||
    $from.parent.content.size > 0
  ) {
    return null;
  }

  return {
    end: $from.after(1),
    index: $from.index(0),
    start: $from.before(1),
  };
}

function deleteRange(editor: Editor, from: number, to: number) {
  const transaction = editor.state.tr.delete(from, to).scrollIntoView();

  editor.view.dispatch(transaction);
  editor.view.focus();
  return true;
}

export function getAdjacentTableDeleteRange(
  state: EditorState,
  direction: DeleteDirection
): AdjacentTableDeleteRange | null {
  const position = getEmptyTopLevelParagraphPosition(state);
  const tableType = state.schema.nodes.table;

  if (!position || !tableType) {
    return null;
  }

  const previousNode =
    position.index > 0 ? state.doc.child(position.index - 1) : null;
  const nextNode =
    position.index < state.doc.childCount - 1
      ? state.doc.child(position.index + 1)
      : null;

  if (direction === 'backward' && previousNode?.type === tableType) {
    return {
      from: position.start - previousNode.nodeSize,
      to: position.start,
    };
  }

  if (direction === 'forward' && nextNode?.type === tableType) {
    return {
      from: position.end,
      to: position.end + nextNode.nodeSize,
    };
  }

  if (
    direction === 'forward' &&
    !nextNode &&
    previousNode?.type === tableType
  ) {
    return {
      from: position.start - previousNode.nodeSize,
      to: position.start,
    };
  }

  return null;
}

export function deleteAdjacentTable(
  editor: Editor,
  direction: DeleteDirection
) {
  const range = getAdjacentTableDeleteRange(editor.state, direction);

  if (!range) {
    return false;
  }

  return deleteRange(editor, range.from, range.to);
}

export const TableEditableEdges = Extension.create({
  name: 'tableEditableEdges',

  priority: 1000,

  onCreate() {
    const transaction = createTableEditableEdgesTransaction(this.editor.state);

    if (transaction) {
      this.editor.view.dispatch(transaction);
    }
  },

  addKeyboardShortcuts() {
    return {
      Backspace: () => deleteAdjacentTable(this.editor, 'backward'),
      Delete: () => deleteAdjacentTable(this.editor, 'forward'),
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction: (_, __, state) =>
          createTableEditableEdgesTransaction(state),
      }),
    ];
  },
});
