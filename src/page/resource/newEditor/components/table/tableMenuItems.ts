import type { TableMenuGroupConfig, TableMenuItemConfig } from './types';

export const tableMenuGroupsConfig: TableMenuGroupConfig[] = [
  {
    items: [
      {
        commandKey: 'addRowBefore',
        key: 'insert-row-before',
        labelKey: 'insert_row_before',
      },
      {
        commandKey: 'addRowAfter',
        key: 'insert-row-after',
        labelKey: 'insert_row_after',
      },
      {
        commandKey: 'deleteRow',
        key: 'delete-row',
        labelKey: 'delete_row',
      },
    ],
    key: 'row',
    labelKey: 'row',
  },
  {
    items: [
      {
        commandKey: 'addColumnBefore',
        key: 'insert-column-before',
        labelKey: 'insert_column_before',
      },
      {
        commandKey: 'addColumnAfter',
        key: 'insert-column-after',
        labelKey: 'insert_column_after',
      },
      {
        commandKey: 'deleteColumn',
        key: 'delete-column',
        labelKey: 'delete_column',
      },
    ],
    key: 'column',
    labelKey: 'column',
  },
  {
    items: [
      {
        commandKey: 'mergeCells',
        key: 'merge-cells',
        labelKey: 'merge_cells',
      },
      {
        commandKey: 'splitCell',
        key: 'split-cell',
        labelKey: 'split_cell',
      },
      {
        commandKey: 'mergeOrSplit',
        key: 'merge-or-split',
        labelKey: 'merge_or_split',
      },
    ],
    key: 'cell',
    labelKey: 'cell',
  },
  {
    items: [
      {
        commandKey: 'setCellAlignLeft',
        key: 'align-left',
        labelKey: 'align_left',
      },
      {
        commandKey: 'setCellAlignCenter',
        key: 'align-center',
        labelKey: 'align_center',
      },
      {
        commandKey: 'setCellAlignRight',
        key: 'align-right',
        labelKey: 'align_right',
      },
    ],
    key: 'align',
    labelKey: 'align',
  },
  {
    items: [
      {
        commandKey: 'toggleHeaderRow',
        key: 'toggle-header-row',
        labelKey: 'toggle_header_row',
      },
      {
        commandKey: 'toggleHeaderColumn',
        key: 'toggle-header-column',
        labelKey: 'toggle_header_column',
      },
      {
        commandKey: 'toggleHeaderCell',
        key: 'toggle-header-cell',
        labelKey: 'toggle_header_cell',
      },
    ],
    key: 'header',
    labelKey: 'header',
  },
];

export const deleteTableItemConfig: TableMenuItemConfig = {
  commandKey: 'deleteTable',
  key: 'delete-table',
  labelKey: 'delete_table',
};
