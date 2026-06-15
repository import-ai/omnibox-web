import type { Editor } from '@tiptap/react';
import { Smile } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/Popover';
import { cn } from '@/lib/utils';

import { toolbarEmojis } from '../emoji/editorEmoji';
import { getToolbarLabel } from '../shortcutLabels';

const iconClassName = 'size-4';

interface EmojiPickerProps {
  disabled?: boolean;
  editor: Editor;
}

function EmojiPicker(props: EmojiPickerProps) {
  const { disabled, editor } = props;
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const label = t('resource.editor.toolbar.emoji');

  const insertEmoji = (shortcode: string) => {
    editor.chain().focus().setEmoji(shortcode).run();
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
      <Smile className={iconClassName} />
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

      <PopoverContent align="start" side="bottom" className="w-72 p-2">
        <div className="grid max-h-64 grid-cols-8 gap-1 overflow-y-auto pr-1">
          {toolbarEmojis.map(item => (
            <button
              key={item.shortcode}
              type="button"
              aria-label={item.emoji}
              className={cn(
                'flex size-7 items-center justify-center rounded text-lg leading-none transition-colors',
                'hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none',
                'dark:hover:bg-neutral-800 dark:focus-visible:bg-neutral-800'
              )}
              onClick={() => insertEmoji(item.shortcode)}
            >
              {item.emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default EmojiPicker;
