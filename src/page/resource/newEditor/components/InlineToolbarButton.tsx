import { ReactNode } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { cn } from '@/lib/utils';

import { getToolbarLabel } from './shortcutLabels';

interface InlineToolbarButtonProps {
  active?: boolean;
  children: ReactNode;
  label: string;
  onClick: () => void;
  shortcut?: string;
}

function InlineToolbarButton(props: InlineToolbarButtonProps) {
  const { active, children, label, onClick, shortcut } = props;

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onMouseDown={event => event.preventDefault()}
          onClick={onClick}
          className={cn(
            'flex size-7 items-center justify-center rounded text-slate-600 transition-colors',
            'hover:bg-slate-200 hover:text-slate-900',
            'dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white',
            active &&
              'bg-slate-200 text-slate-950 dark:bg-neutral-800 dark:text-white'
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">
        {getToolbarLabel(label, shortcut)}
      </TooltipContent>
    </Tooltip>
  );
}

export default InlineToolbarButton;
