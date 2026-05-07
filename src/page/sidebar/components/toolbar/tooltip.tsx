import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/ui/button';

interface IProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}

export function ToolbarButton({ label, icon: Icon, onClick }: IProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="size-7 text-neutral-400 hover:bg-[#E6E6EC] hover:text-neutral-400 dark:hover:bg-accent"
          onClick={onClick}
          aria-label={label}
        >
          <Icon />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
