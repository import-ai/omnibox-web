import { Extension } from '@tiptap/react';

import { insertTable } from './table/tableActions';
import { insertEmptyParagraph } from './toolbarActions';

export const OPEN_LINK_POPOVER_EVENT = 'omnibox:new-editor:open-link-popover';

export const EditorKeyboardShortcuts = Extension.create({
  name: 'editorKeyboardShortcuts',

  priority: 1000,

  addKeyboardShortcuts() {
    return {
      'Mod-Alt-2': () => this.editor.commands.toggleHeading({ level: 2 }),
      'Mod-Shift-k': () => {
        window.dispatchEvent(new CustomEvent(OPEN_LINK_POPOVER_EVENT));
        return true;
      },
      'Mod-Shift-c': () => this.editor.commands.toggleCodeBlock(),
      'Mod-Shift-h': () => this.editor.commands.setHorizontalRule(),
      'Mod-m': () =>
        insertTable(this.editor, {
          cols: 3,
          rows: 3,
        }),
      'Mod-;': () => this.editor.commands.toggleBlockquote(),
      'Mod-Alt-ArrowUp': () => {
        insertEmptyParagraph(this.editor, 'before');
        return true;
      },
      'Mod-Alt-ArrowDown': () => {
        insertEmptyParagraph(this.editor, 'after');
        return true;
      },
    };
  },
});
