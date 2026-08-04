import { ArrowDown, ArrowUp, Check, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/tooltip';
import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { cn } from '@/lib/utils';
import type { ResourceSortBy, ResourceSortOptions } from '@/service/resource';

import { getNextShareSort } from './shareSort';

interface ShareSortSelectorProps {
  disabled: boolean;
  manualSortAvailable: boolean;
  sort: ResourceSortOptions;
  onChange: (sort: ResourceSortOptions) => void;
}

const sortOptions: ResourceSortBy[] = [
  'updated_at',
  'created_at',
  'title',
  'manual',
];

export function ShareSortSelector({
  disabled,
  manualSortAvailable,
  sort,
  onChange,
}: ShareSortSelectorProps) {
  const { t } = useTranslation();

  const selectSort = (sortBy: ResourceSortBy) => {
    onChange(getNextShareSort(sort, sortBy));
  };

  const renderOption = (sortBy: ResourceSortBy) => {
    const selected = sort.sort_by === sortBy;
    const manualDisabled = sortBy === 'manual' && !manualSortAvailable;
    const DirectionIcon = sort.sort_order === 'desc' ? ArrowDown : ArrowUp;
    const item = (
      <DropdownMenuItem
        key={sortBy}
        aria-disabled={manualDisabled}
        className={cn(
          'h-9 justify-between',
          manualDisabled && 'cursor-not-allowed opacity-50'
        )}
        onSelect={event => {
          if (manualDisabled) {
            event.preventDefault();
            return;
          }
          selectSort(sortBy);
        }}
      >
        {t(`sidebar.sort.${sortBy}`)}
        {selected &&
          (sortBy === 'manual' ? (
            <Check className="size-4 text-blue-500" />
          ) : (
            <DirectionIcon className="size-4 text-blue-500" />
          ))}
      </DropdownMenuItem>
    );

    if (!manualDisabled) return item;

    return (
      <Tooltip key={sortBy}>
        <TooltipTrigger asChild>{item}</TooltipTrigger>
        <TooltipContent side="left" className="max-w-52">
          {t('share.share.sort.manual_unavailable')}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className="h-6 w-36 justify-between px-2 text-xs font-normal"
          >
            <span className="truncate">
              {t(`sidebar.sort.${sort.sort_by}`)}
            </span>
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          {sortOptions.map(renderOption)}
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}
