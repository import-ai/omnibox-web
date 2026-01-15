import { Info } from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { SegmentedProgressBar } from './segmented-progress-bar';

export interface StorageItem {
  label: string;
  color: string;
  tooltip?: string;
}

export interface StorageSectionProps {
  title: string;
  current: string;
  items: StorageItem[];
  segments: Array<{ label: string; color: string; percentage: number }>;
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
        <h2 className="text-sm font-medium text-black">{title}</h2>
        <span className="text-sm font-medium text-neutral-500">{current}</span>
      </div>
      <SegmentedProgressBar segments={segments} />
      <div className="flex flex-wrap gap-7">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1 min-w-14">
            <div className={`size-2 rounded-full ${item.color}`} />
            <span className="text-sm font-medium text-neutral-400">
              {item.label}
            </span>
            {item.tooltip && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="size-3 text-neutral-400" />
                </TooltipTrigger>
                <TooltipContent>{item.tooltip}</TooltipContent>
              </Tooltip>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
