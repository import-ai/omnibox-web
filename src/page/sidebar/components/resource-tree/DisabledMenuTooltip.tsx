import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';

interface DisabledMenuTooltipProps {
  side?: 'top' | 'right' | 'bottom' | 'left';
  content?: string;
  children: React.ReactNode;
}

export function DisabledMenuTooltip({
  content,
  children,
  side = 'right',
}: DisabledMenuTooltipProps) {
  if (!content) {
    return children;
  }

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{content}</TooltipContent>
    </Tooltip>
  );
}
