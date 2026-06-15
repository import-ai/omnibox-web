import * as HoverCardPrimitive from '@radix-ui/react-hover-card';
import type { Editor } from '@tiptap/react';
import { Table } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

import { getToolbarLabel, shortcutLabels } from '../shortcutLabels';
import { insertTable } from './tableActions';

const iconClassName = 'size-4';
const maxRows = 6;
const maxCols = 6;
const defaultSize = { rows: 1, cols: 1 };
const pickerCells = Array.from({ length: maxRows * maxCols }, (_, index) => ({
  rows: Math.floor(index / maxCols) + 1,
  cols: (index % maxCols) + 1,
}));

interface TableSizePickerProps {
  disabled?: boolean;
  editor: Editor;
}

function TableSizePicker(props: TableSizePickerProps) {
  const { disabled, editor } = props;
  const { t } = useTranslation();
  const [hoveredSize, setHoveredSize] = useState(defaultSize);

  const label = t('resource.editor.toolbar.table');

  return (
    <HoverCardPrimitive.Root
      closeDelay={100}
      openDelay={0}
      onOpenChange={open => {
        if (!open) {
          setHoveredSize(defaultSize);
        }
      }}
    >
      <HoverCardPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label={getToolbarLabel(label, shortcutLabels.table)}
          disabled={disabled}
          onMouseDown={event => event.preventDefault()}
          onClick={() => insertTable(editor, { cols: 3, rows: 3 })}
          className={cn(
            'flex size-7 items-center justify-center rounded text-slate-600 transition-colors',
            'hover:bg-slate-200 hover:text-slate-900',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400',
            'disabled:pointer-events-none disabled:text-slate-300',
            'dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white'
          )}
        >
          <Table className={iconClassName} />
        </button>
      </HoverCardPrimitive.Trigger>

      {!disabled && (
        <HoverCardPrimitive.Portal>
          <HoverCardPrimitive.Content
            align="start"
            side="bottom"
            sideOffset={8}
            className={cn(
              'z-50 w-fit rounded-md border border-slate-200 bg-white p-2 shadow-xl outline-none',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
              'dark:border-neutral-700 dark:bg-neutral-900'
            )}
          >
            <div className="mb-1.5 text-sm font-medium text-slate-500 dark:text-neutral-300">
              {label}
            </div>
            <div className="inline-grid grid-cols-6 gap-px bg-slate-300 p-px dark:bg-neutral-700">
              {pickerCells.map(({ cols, rows }) => {
                const selected =
                  rows <= hoveredSize.rows && cols <= hoveredSize.cols;

                return (
                  <button
                    key={`${rows}-${cols}`}
                    type="button"
                    aria-label={t('resource.editor.table_picker.insert', {
                      cols,
                      rows,
                    })}
                    onFocus={() => setHoveredSize({ rows, cols })}
                    onMouseEnter={() => setHoveredSize({ rows, cols })}
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => insertTable(editor, { cols, rows })}
                    className={cn(
                      'size-4 bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
                      'dark:bg-neutral-950',
                      selected &&
                        'bg-blue-100 dark:bg-blue-500/30 dark:ring-blue-400'
                    )}
                  />
                );
              })}
            </div>
            <div className="mt-2 text-base font-medium text-slate-900 dark:text-neutral-100">
              {t('resource.editor.table_picker.size', {
                cols: hoveredSize.cols,
                rows: hoveredSize.rows,
              })}
            </div>
          </HoverCardPrimitive.Content>
        </HoverCardPrimitive.Portal>
      )}
    </HoverCardPrimitive.Root>
  );
}

export default TableSizePicker;
