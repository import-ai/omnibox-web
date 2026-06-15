import type { Editor } from '@tiptap/react';
import { useEditorState } from '@tiptap/react';
import { ListTree } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/Popover';
import { cn } from '@/lib/utils';

import { type EditorMode, isSourceEditorMode } from '../editorMode';
import { getToolbarLabel } from '../shortcutLabels';
import {
  getOutlineItemsFromDoc,
  getOutlineItemsFromMarkdown,
  type OutlineItem,
} from './outlineItems';

const iconClassName = 'size-4';

interface OutlinePopoverProps {
  disabled?: boolean;
  editor: Editor;
  mode: EditorMode;
  onSelectSourceLine: (line: number) => void;
  sourceContent: string;
}

function getIndentClassName(level: number) {
  switch (level) {
    case 1:
      return 'pl-2';
    case 2:
      return 'pl-5';
    case 3:
      return 'pl-8';
    case 4:
      return 'pl-11';
    case 5:
      return 'pl-14';
    default:
      return 'pl-16';
  }
}

function OutlinePopover(props: OutlinePopoverProps) {
  const { disabled, editor, mode, onSelectSourceLine, sourceContent } = props;
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const label = t('resource.editor.toolbar.outline');
  const docItems = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) =>
      getOutlineItemsFromDoc(currentEditor.state.doc),
  });
  const sourceItems = useMemo(
    () => getOutlineItemsFromMarkdown(sourceContent),
    [sourceContent]
  );
  const items = isSourceEditorMode(mode) ? sourceItems : docItems;

  const selectItem = (item: OutlineItem) => {
    setOpen(false);

    if (isSourceEditorMode(mode)) {
      onSelectSourceLine(item.line ?? 1);
      return;
    }

    if (typeof item.pos !== 'number') {
      return;
    }

    const selectionPos = Math.min(item.pos + 1, editor.state.doc.content.size);
    editor
      .chain()
      .focus()
      .setTextSelection(selectionPos)
      .scrollIntoView()
      .run();
  };

  const button = (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onMouseDown={event => event.preventDefault()}
      className={cn(
        'flex size-7 items-center justify-center rounded text-slate-600 transition-colors',
        'hover:bg-slate-200 hover:text-slate-900',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400',
        'disabled:pointer-events-none disabled:text-slate-300',
        'dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white',
        open &&
          'bg-slate-200 text-slate-950 dark:bg-neutral-800 dark:text-white'
      )}
    >
      <ListTree className={iconClassName} />
    </button>
  );

  return (
    <Popover open={!disabled && open} onOpenChange={setOpen}>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          {disabled ? (
            <span className="inline-flex cursor-not-allowed">{button}</span>
          ) : (
            <PopoverTrigger asChild>{button}</PopoverTrigger>
          )}
        </TooltipTrigger>
        <TooltipContent side="top">{getToolbarLabel(label)}</TooltipContent>
      </Tooltip>

      <PopoverContent
        align="end"
        onOpenAutoFocus={event => {
          event.preventDefault();
        }}
        side="bottom"
        sideOffset={8}
        className="w-64 p-2"
      >
        <div className="mb-1.5 px-2 text-sm font-medium text-slate-700 dark:text-neutral-200">
          {label}
        </div>
        {items.length ? (
          <div className="max-h-72 overflow-y-auto">
            {items.map(item => (
              <button
                key={item.id}
                type="button"
                className={cn(
                  'flex w-full items-center rounded px-2 py-1.5 text-left text-sm text-slate-700 transition-colors',
                  'hover:bg-slate-100 hover:text-slate-950',
                  'focus-visible:bg-slate-100 focus-visible:text-slate-950 focus-visible:outline-none',
                  'dark:text-neutral-200 dark:hover:bg-neutral-800 dark:hover:text-white',
                  'dark:focus-visible:bg-neutral-800 dark:focus-visible:text-white',
                  getIndentClassName(item.level)
                )}
                onClick={() => selectItem(item)}
              >
                <span className="truncate">{item.text}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="px-2 py-6 text-center text-sm text-slate-500 dark:text-neutral-400">
            {t('resource.editor.outline.empty')}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default OutlinePopover;
