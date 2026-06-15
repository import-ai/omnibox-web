import type { Editor } from '@tiptap/react';

export interface InsertTableOptions {
  cols: number;
  rows: number;
}

export function canInsertTable(editor: Editor, options: InsertTableOptions) {
  return (
    !editor.isActive('table') &&
    editor.can().insertTable({
      ...options,
      withHeaderRow: true,
    })
  );
}

export function insertTable(editor: Editor, options: InsertTableOptions) {
  if (!canInsertTable(editor, options)) {
    return false;
  }

  return editor
    .chain()
    .focus()
    .insertTable({
      ...options,
      withHeaderRow: true,
    })
    .run();
}
