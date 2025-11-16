import { HelpCircle } from 'lucide-react';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useIsTouch } from '@/hooks/use-is-touch';
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
          <HelpCircle
            className={cn('w-3.5 h-3.5 text-muted-foreground', iconClassName)}
          />
        </PopoverTrigger>
        <PopoverContent className="max-w-xs">
          <p className="text-sm">{content}</p>
        </PopoverContent>
      </Popover>
    );
  }

  // Use Tooltip for non-touch devices
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle
            className={cn(
              'w-3.5 h-3.5 text-muted-foreground cursor-help',
              iconClassName
            )}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
