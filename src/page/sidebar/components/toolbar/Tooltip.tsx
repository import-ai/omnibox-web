import { Button } from '@/components/Button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
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
            className="size-5 rounded-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:bg-transparent"
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
