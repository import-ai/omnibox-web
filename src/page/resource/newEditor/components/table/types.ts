export interface MenuPosition {
  x: number;
  y: number;
}

export interface TableMenuLabels {
  align: string;
  align_center: string;
  align_left: string;
  align_right: string;
  cell: string;
  column: string;
  delete_column: string;
  delete_row: string;
  delete_table: string;
  header: string;
  insert_column_after: string;
  insert_column_before: string;
  insert_row_after: string;
  insert_row_before: string;
  merge_cells: string;
  merge_or_split: string;
  row: string;
  split_cell: string;
  toggle_header_cell: string;
  toggle_header_column: string;
  toggle_header_row: string;
}

export interface TableMenuAction {
  disabled: boolean;
  key: string;
  label: string;
  onSelect: () => void;
}

export interface TableMenuGroup {
  actions: TableMenuAction[];
  key: string;
  label: string;
}

export type TableMenuLabelKey = keyof TableMenuLabels;

export type TableCommandKey =
  | 'addColumnAfter'
  | 'addColumnBefore'
  | 'addRowAfter'
  | 'addRowBefore'
  | 'deleteColumn'
  | 'deleteRow'
  | 'deleteTable'
  | 'mergeCells'
  | 'mergeOrSplit'
  | 'setCellAlignCenter'
  | 'setCellAlignLeft'
  | 'setCellAlignRight'
  | 'splitCell'
  | 'toggleHeaderCell'
  | 'toggleHeaderColumn'
  | 'toggleHeaderRow';

export interface TableMenuItemConfig {
  commandKey: TableCommandKey;
  key: string;
  labelKey: TableMenuLabelKey;
}

export interface TableMenuGroupConfig {
  items: TableMenuItemConfig[];
  key: string;
  labelKey: TableMenuLabelKey;
}
