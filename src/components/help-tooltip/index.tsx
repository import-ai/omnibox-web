import { HelpCircle } from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils.ts';

interface HelpTooltipProps {
  content: string;
  className?: string;
  iconClassName?: string;
}

export function HelpTooltip({
  content,
  className,
  iconClassName,
}: HelpTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex items-center justify-center outline-none cursor-help',
              className
            )}
            onClick={e => e.preventDefault()}
          >
            <HelpCircle
              className={cn('w-3.5 h-3.5 text-muted-foreground', iconClassName)}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
