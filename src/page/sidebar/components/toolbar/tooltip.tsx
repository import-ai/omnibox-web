import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface IProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  disabledLabel?: string;
}

export function ToolbarButton({
  label,
  onClick,
  icon: Icon,
  disabledLabel,
}: IProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Button
            size="icon"
            variant="ghost"
            onClick={onClick}
            aria-label={label}
            disabled={!!disabledLabel}
            className={cn(
              'size-[18px] rounded-sm text-[#8F959E]',
              'hover:bg-[rgba(23,23,23,0.1)] active:bg-[rgba(23,23,23,0.15)]',
              'disabled:cursor-not-allowed disabled:text-neutral-300',
              'dark:text-neutral-300 dark:hover:text-muted-foreground dark:hover:bg-[rgba(255,255,255,0.1)] dark:active:text-[#fafafa] dark:active:bg-[rgba(255,255,255,0.2)] dark:disabled:text-neutral-500',
              'disabled:opacity-100 disabled:pointer-events-auto disabled:bg-transparent'
            )}
          >
            <Icon className="size-4" />
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{disabledLabel || label}</TooltipContent>
    </Tooltip>
  );
}
