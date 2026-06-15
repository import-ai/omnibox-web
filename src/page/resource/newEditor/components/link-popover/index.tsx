import type { Editor } from '@tiptap/react';
import { Check, Link, X } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Input } from '@/components/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/ui/Button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/Popover';
import { cn } from '@/lib/utils';

import { OPEN_LINK_POPOVER_EVENT } from '../keyboardShortcuts';
import { getToolbarLabel } from '../shortcutLabels';

interface LinkPopoverProps {
  align?: 'start' | 'center' | 'end';
  buttonClassName?: string;
  contentSide?: 'top' | 'right' | 'bottom' | 'left';
  editor: Editor | null;
  hideWhenUnavailable?: boolean;
  iconClassName?: string;
  shortcut?: string;
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left';
}

function canSetLink(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) {
    return false;
  }

  try {
    return editor.can().setMark('link');
  } catch {
    return false;
  }
}

function LinkPopover(props: LinkPopoverProps) {
  const {
    align = 'start',
    buttonClassName,
    contentSide = 'bottom',
    editor,
    hideWhenUnavailable = false,
    iconClassName = 'size-4',
    shortcut,
    tooltipSide = 'top',
  } = props;
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');

  const isActive = editor?.isActive('link') || false;
  const canSet = canSetLink(editor);
  const disabled = !canSet && !isActive;
  const label = t('resource.editor.toolbar.link');

  useEffect(() => {
    if (!open || !editor) {
      return;
    }

    const linkAttrs = editor.getAttributes('link');

    setUrl((linkAttrs.href as string | undefined) || '');
  }, [editor, open]);

  useEffect(() => {
    const handleOpen = () => {
      if (!editor || disabled) {
        return;
      }

      editor.chain().focus().run();
      setOpen(true);
    };

    window.addEventListener(OPEN_LINK_POPOVER_EVENT, handleOpen);

    return () => {
      window.removeEventListener(OPEN_LINK_POPOVER_EVENT, handleOpen);
    };
  }, [disabled, editor]);

  if (!editor || (hideWhenUnavailable && disabled)) {
    return null;
  }

  const setLink = () => {
    const normalizedUrl = url.trim();

    if (!normalizedUrl) {
      removeLink();
      return;
    }

    const { selection } = editor.state;
    let chain = editor.chain().focus().extendMarkRange('link').setLink({
      href: normalizedUrl,
    });

    if (selection.empty) {
      chain = chain.insertContent({ type: 'text', text: normalizedUrl });
    }

    chain.run();
    setOpen(false);
  };

  const removeLink = () => {
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .unsetLink()
      .setMeta('preventAutolink', true)
      .run();
    setOpen(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLink();
  };

  const linkButton = (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isActive}
      disabled={disabled}
      onMouseDown={event => event.preventDefault()}
      onClick={() => setOpen(true)}
      className={cn(
        'flex size-7 items-center justify-center rounded text-slate-600 transition-colors',
        'hover:bg-slate-200 hover:text-slate-900',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400',
        'disabled:pointer-events-none disabled:text-slate-300',
        'dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white',
        isActive &&
          'bg-slate-200 text-slate-950 dark:bg-neutral-800 dark:text-white',
        buttonClassName
      )}
    >
      <Link className={iconClassName} />
    </button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <span className={cn('inline-flex', disabled && 'cursor-not-allowed')}>
            <PopoverTrigger asChild>{linkButton}</PopoverTrigger>
          </span>
        </TooltipTrigger>
        <TooltipContent side={tooltipSide}>
          {getToolbarLabel(label, shortcut)}
        </TooltipContent>
      </Tooltip>
      <PopoverContent align={align} side={contentSide} className="w-80 p-2">
        <form className="flex items-center gap-1" onSubmit={handleSubmit}>
          <Input
            value={url}
            placeholder={t('resource.editor.link.url')}
            className="h-8 px-2 text-xs"
            autoFocus
            onChange={event => setUrl(event.target.value)}
          />
          <Button
            type="submit"
            size="icon"
            title={t('resource.editor.link.apply')}
            aria-label={t('resource.editor.link.apply')}
            disabled={!url && !isActive}
            className="size-7 shrink-0"
          >
            <Check className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            title={t('cancel')}
            aria-label={t('cancel')}
            className="size-7 shrink-0"
            onClick={() => setOpen(false)}
          >
            <X className="size-4" />
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

export default LinkPopover;
