import { cn } from 'cn';
import * as React from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
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
        'hover:bg-transparent',
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
    <Tooltip>
      <TooltipTrigger asChild>
        {disabled ? (
          <span className={cn('inline-flex', disabled && 'cursor-not-allowed')}>
            {button}
          </span>
        ) : (
          button
        )}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
});

export { IconButton };
