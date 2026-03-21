import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/tooltip';

import {
  type QuotaProgressSegment,
  SegmentedProgressBar,
} from './segmented-progress-bar';

export interface StorageItem {
  label: string;
  color: string;
  tooltip?: string;
}

export interface StorageSectionProps {
  title: string;
  current: string;
  items: StorageItem[];
  segments: QuotaProgressSegment[];
}

export function StorageSection({
  title,
  current,
  items,
  segments,
}: StorageSectionProps) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        <span className="text-sm font-medium text-muted-foreground">
          {current}
        </span>
      </div>
      <SegmentedProgressBar segments={segments} />
      <TooltipProvider delayDuration={200}>
        <div className="flex flex-wrap gap-7">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-1 min-w-14">
              <div className={`size-2 rounded-full ${item.color}`} />
              {item.tooltip ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-sm font-medium text-muted-foreground cursor-pointer">
                      {item.label}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" showArrow>
                    {item.tooltip}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <span className="text-sm font-medium text-muted-foreground">
                  {item.label}
                </span>
              )}
            </div>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
}
