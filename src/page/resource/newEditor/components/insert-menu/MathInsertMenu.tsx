import type { Editor } from '@tiptap/react';
import { Sigma } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/Popover';
import { cn } from '@/lib/utils';

import { getToolbarLabel } from '../shortcutLabels';
import {
  createBlockMathSnippet,
  createInlineMathSnippet,
  insertMarkdownSnippet,
} from './insertSnippets';

const iconClassName = 'size-4';

interface MathInsertMenuProps {
  disabled?: boolean;
  editor: Editor;
}

function MathInsertMenu(props: MathInsertMenuProps) {
  const { disabled, editor } = props;
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const label = t('resource.editor.toolbar.math');

  const insertSnippet = (snippet: string) => {
    insertMarkdownSnippet(editor, snippet);
    setOpen(false);
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
      <Sigma className={iconClassName} />
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

      <PopoverContent align="start" side="bottom" className="w-40 p-1">
        <button
          type="button"
          className={cn(
            'flex w-full items-center rounded px-2 py-1.5 text-left text-sm text-slate-700 transition-colors',
            'hover:bg-slate-100 hover:text-slate-950 focus-visible:bg-slate-100 focus-visible:outline-none',
            'dark:text-neutral-200 dark:hover:bg-neutral-800 dark:hover:text-white dark:focus-visible:bg-neutral-800'
          )}
          onClick={() => insertSnippet(createInlineMathSnippet())}
        >
          {t('resource.editor.insert.inline_math')}
        </button>
        <button
          type="button"
          className={cn(
            'flex w-full items-center rounded px-2 py-1.5 text-left text-sm text-slate-700 transition-colors',
            'hover:bg-slate-100 hover:text-slate-950 focus-visible:bg-slate-100 focus-visible:outline-none',
            'dark:text-neutral-200 dark:hover:bg-neutral-800 dark:hover:text-white dark:focus-visible:bg-neutral-800'
          )}
          onClick={() => insertSnippet(createBlockMathSnippet())}
        >
          {t('resource.editor.insert.block_math')}
        </button>
      </PopoverContent>
    </Popover>
  );
}

export default MathInsertMenu;
