import type { Editor } from '@tiptap/react';
import { useMemo } from 'react';

import { deleteTableItemConfig, tableMenuGroupsConfig } from './tableMenuItems';
import type {
  TableCommandKey,
  TableMenuAction,
  TableMenuGroup,
  TableMenuItemConfig,
  TableMenuLabels,
} from './types';

interface TableCommandHandler {
  canRun: (editor: Editor) => boolean;
  run: (editor: Editor) => boolean;
}

function setCellAlign(editor: Editor, align: 'center' | 'left' | 'right') {
  return editor.chain().focus().setCellAttribute('align', align).run();
}

const tableCommandHandlers: Record<TableCommandKey, TableCommandHandler> = {
  addColumnAfter: {
    canRun: editor => editor.can().addColumnAfter(),
    run: editor => editor.chain().focus().addColumnAfter().run(),
  },
  addColumnBefore: {
    canRun: editor => editor.can().addColumnBefore(),
    run: editor => editor.chain().focus().addColumnBefore().run(),
  },
  addRowAfter: {
    canRun: editor => editor.can().addRowAfter(),
    run: editor => editor.chain().focus().addRowAfter().run(),
  },
  addRowBefore: {
    canRun: editor => editor.can().addRowBefore(),
    run: editor => editor.chain().focus().addRowBefore().run(),
  },
  deleteColumn: {
    canRun: editor => editor.can().deleteColumn(),
    run: editor => editor.chain().focus().deleteColumn().run(),
  },
  deleteRow: {
    canRun: editor => editor.can().deleteRow(),
    run: editor => editor.chain().focus().deleteRow().run(),
  },
  deleteTable: {
    canRun: editor => editor.can().deleteTable(),
    run: editor => editor.chain().focus().deleteTable().run(),
  },
  mergeCells: {
    canRun: editor => editor.can().mergeCells(),
    run: editor => editor.chain().focus().mergeCells().run(),
  },
  mergeOrSplit: {
    canRun: editor => editor.can().mergeOrSplit(),
    run: editor => editor.chain().focus().mergeOrSplit().run(),
  },
  setCellAlignCenter: {
    canRun: editor => editor.can().setCellAttribute('align', 'center'),
    run: editor => setCellAlign(editor, 'center'),
  },
  setCellAlignLeft: {
    canRun: editor => editor.can().setCellAttribute('align', 'left'),
    run: editor => setCellAlign(editor, 'left'),
  },
  setCellAlignRight: {
    canRun: editor => editor.can().setCellAttribute('align', 'right'),
    run: editor => setCellAlign(editor, 'right'),
  },
  splitCell: {
    canRun: editor => editor.can().splitCell(),
    run: editor => editor.chain().focus().splitCell().run(),
  },
  toggleHeaderCell: {
    canRun: editor => editor.can().toggleHeaderCell(),
    run: editor => editor.chain().focus().toggleHeaderCell().run(),
  },
  toggleHeaderColumn: {
    canRun: editor => editor.can().toggleHeaderColumn(),
    run: editor => editor.chain().focus().toggleHeaderColumn().run(),
  },
  toggleHeaderRow: {
    canRun: editor => editor.can().toggleHeaderRow(),
    run: editor => editor.chain().focus().toggleHeaderRow().run(),
  },
};

function canRun(command: () => boolean) {
  try {
    return command();
  } catch {
    return false;
  }
}

function createAction(
  config: TableMenuItemConfig,
  editor: Editor,
  labels: TableMenuLabels,
  closeMenu: () => void
): TableMenuAction {
  const command = tableCommandHandlers[config.commandKey];

  return {
    disabled: !canRun(() => command.canRun(editor)),
    key: config.key,
    label: labels[config.labelKey],
    onSelect: () => {
      command.run(editor);
      closeMenu();
    },
  };
}

export function useTableMenuItems(
  editor: Editor | null,
  labels: TableMenuLabels,
  closeMenu: () => void
) {
  return useMemo(() => {
    if (!editor) {
      return null;
    }

    const groups: TableMenuGroup[] = tableMenuGroupsConfig.map(group => ({
      actions: group.items.map(item =>
        createAction(item, editor, labels, closeMenu)
      ),
      key: group.key,
      label: labels[group.labelKey],
    }));

    return {
      deleteTableAction: createAction(
        deleteTableItemConfig,
        editor,
        labels,
        closeMenu
      ),
      groups,
    };
  }, [closeMenu, editor, labels]);
}
