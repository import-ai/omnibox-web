import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';

interface IProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  disabledLabel?: string;
  iconClassName?: string;
  loading?: boolean;
}

export function ToolbarButton({
  label,
  onClick,
  icon: Icon,
  disabledLabel,
  iconClassName,
  loading,
}: IProps) {
  const disabled = !!disabledLabel || loading;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn('inline-flex', {
            'cursor-not-allowed': disabled,
          })}
        >
          <Button
            size="icon"
            variant="ghost"
            onClick={onClick}
            aria-label={label}
            disabled={disabled}
            className={cn(
              'size-[18px] rounded-sm text-[#8F959E]',
              'hover:text-[#8F959E] hover:bg-[rgba(23,23,23,0.1)] active:text-[#8F959E] active:bg-[rgba(23,23,23,0.15)]',
              'disabled:cursor-not-allowed disabled:text-neutral-300 disabled:bg-transparent',
              'dark:text-neutral-300 dark:hover:text-neutral-400 dark:hover:bg-[rgba(255,255,255,0.1)] dark:active:text-[#fafafa] dark:active:bg-[rgba(255,255,255,0.2)] dark:disabled:text-primary-foreground',
              'disabled:opacity-100 disabled:pointer-events-none disabled:hover:bg-transparent dark:disabled:bg-transparent dark:disabled:text-neutral-700 dark:disabled:hover:bg-transparent'
            )}
          >
            {loading ? (
              <Spinner />
            ) : (
              <Icon className={cn('size-4', iconClassName)} />
            )}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{disabledLabel || label}</TooltipContent>
    </Tooltip>
  );
}
