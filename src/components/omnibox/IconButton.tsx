import { cn } from 'cn';
import * as React from 'react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/tooltip';
import { Button } from '@/components/ui/button';

const iconButtonSizes = {
  xs: 'size-5 rounded-sm',
  sm: 'size-7',
  md: '',
} as const;

const iconButtonTones = {
  sidebar: 'text-muted-foreground hover:text-sidebar-accent-foreground',
  muted: 'text-muted-foreground hover:text-muted-foreground',
  accent: 'text-muted-foreground hover:text-foreground',
} as const;

type IconButtonSize = keyof typeof iconButtonSizes;
type IconButtonTone = keyof typeof iconButtonTones;

/**
 * Hover and press only. Ghost ships `hover:bg-muted` and
 * `dark:hover:bg-muted/50` as separate utilities. `hover:bg-transparent`
 * only replaces the light slot; `dark:hover:bg-transparent` must be paired.
 * `!` is required because ui/Button feeds `className` through CVA, so both
 * fills can remain in the class string and stylesheet order then prefers
 * `muted/50` in dark mode.
 */
export const iconButtonHoverClassName =
  'hover:bg-transparent! dark:hover:bg-transparent! aria-expanded:bg-transparent! data-[state=open]:bg-transparent! data-open:bg-transparent!';

/** Hover and press only. Open menus do not add a selected background. */
export const sidebarToolbarIconButtonClassName = cn(
  iconButtonTones.sidebar,
  iconButtonHoverClassName,
  'transition-all active:translate-y-px'
);

const IconButton = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentProps<typeof Button> & {
    label: React.ReactNode;
    size?: IconButtonSize;
    tone: IconButtonTone;
    destructive?: boolean;
  }
>(function IconButton(
  {
    label,
    size = 'md',
    tone,
    destructive = false,
    className,
    children,
    disabled,
    ...props
  },
  ref
) {
  const button = (
    <Button
      ref={ref}
      size="icon"
      variant="ghost"
      disabled={disabled}
      aria-label={typeof label === 'string' ? label : props['aria-label']}
      className={cn(
        iconButtonSizes[size],
        iconButtonHoverClassName,
        iconButtonTones[tone],
        destructive && 'hover:text-destructive',
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {disabled ? (
            <span
              className={cn('inline-flex', disabled && 'cursor-not-allowed')}
            >
              {button}
            </span>
          ) : (
            button
          )}
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

export { IconButton };
