import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/tooltip';

export interface QuotaProgressSegment {
  label: string;
  color: string;
  percentage: number;
  tooltip: string;
}

interface SegmentedProgressBarProps {
  segments: QuotaProgressSegment[];
}

export function SegmentedProgressBar({ segments }: SegmentedProgressBarProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex w-full bg-neutral-200 dark:bg-neutral-700 h-2 overflow-hidden">
        {segments.map((segment, idx) => {
          const width = `${segment.percentage}%`;
          const shouldShowTooltip = segment.percentage > 0;

          if (!shouldShowTooltip) {
            return (
              <div
                key={idx}
                className={`h-full shrink-0 cursor-default ${segment.color}`}
                style={{ width }}
              />
            );
          }

          return (
            <Tooltip key={idx}>
              <TooltipTrigger asChild>
                <div
                  className={`h-full shrink-0 cursor-pointer ${segment.color}`}
                  style={{ width }}
                />
              </TooltipTrigger>
              <TooltipContent side="top">{segment.tooltip}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
