import { CircleHelp } from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/Popover';
import { useIsTouch } from '@/hooks/useIsTouch';
import { cn } from '@/lib/utils.ts';

interface HelpTooltipProps {
  content: string;
  iconClassName?: string;
}

export function HelpTooltip({ content, iconClassName }: HelpTooltipProps) {
  const isTouch = useIsTouch();

  if (isTouch) {
    // Use Popover for touch devices
    return (
      <Popover>
        <PopoverTrigger asChild>
          <CircleHelp
            className={cn('w-3.5 h-3.5 text-muted-foreground', iconClassName)}
          />
        </PopoverTrigger>
        <PopoverContent className="max-w-xs">
          <p className="whitespace-pre-line text-sm">{content}</p>
        </PopoverContent>
      </Popover>
    );
  }

  // Use Tooltip for non-touch devices
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <CircleHelp
            className={cn(
              'w-3.5 h-3.5 text-muted-foreground cursor-help',
              iconClassName
            )}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p className="whitespace-pre-line">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
