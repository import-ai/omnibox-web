import { SquarePen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { cn } from '@/lib/utils';

import type { EditorMode } from '../editorMode';
import {
  formatShortcutLabel,
  getToolbarLabel,
  shortcutLabels,
} from '../shortcutLabels';

const iconClassName = 'size-4';

interface EditModeMenuProps {
  disabled?: boolean;
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
}

function EditModeMenu(props: EditModeMenuProps) {
  const { disabled, mode, onModeChange } = props;
  const { t } = useTranslation();
  const label = t('resource.editor.toolbar.edit_mode');
  const items: Array<{
    label: string;
    shortcut: string;
    value: EditorMode;
  }> = [
    {
      label: t('resource.editor.toolbar.wysiwyg_mode'),
      shortcut: shortcutLabels.wysiwygMode,
      value: 'wysiwyg',
    },
    {
      label: t('resource.editor.toolbar.instant_render_mode'),
      shortcut: shortcutLabels.instantRenderMode,
      value: 'instant',
    },
    {
      label: t('resource.editor.toolbar.split_preview_mode'),
      shortcut: shortcutLabels.splitPreviewMode,
      value: 'split',
    },
  ];

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
        mode !== 'wysiwyg' &&
          'bg-slate-200 text-blue-500 dark:bg-neutral-800 dark:text-blue-400'
      )}
    >
      <SquarePen className={iconClassName} />
    </button>
  );

  return (
    <DropdownMenu>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          {disabled ? (
            <span className="inline-flex cursor-not-allowed">{button}</span>
          ) : (
            <DropdownMenuTrigger asChild>{button}</DropdownMenuTrigger>
          )}
        </TooltipTrigger>
        <TooltipContent side="top">{getToolbarLabel(label)}</TooltipContent>
      </Tooltip>

      {!disabled && (
        <DropdownMenuContent
          side="bottom"
          align="start"
          sideOffset={4}
          className="w-40 p-0.5"
        >
          <DropdownMenuRadioGroup
            value={mode}
            onValueChange={value => onModeChange(value as EditorMode)}
          >
            {items.map(item => (
              <DropdownMenuRadioItem
                key={item.value}
                value={item.value}
                className="h-7 cursor-pointer py-0.5 pl-7 pr-2 text-[13px] leading-5 data-[state=checked]:text-blue-500"
              >
                <span className="truncate">{item.label}</span>
                <DropdownMenuShortcut className="ml-2 shrink-0 text-[11px] tracking-normal">
                  {formatShortcutLabel(item.shortcut)}
                </DropdownMenuShortcut>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}

export default EditModeMenu;
