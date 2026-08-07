import { Check, ChevronDown } from 'lucide-react';
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

import { getShareSortOrderOptions } from './shareSort';

interface ShareSortSelectorProps {
  disabled: boolean;
  manualSortAvailable: boolean;
  sort: ResourceSortOptions;
  onChange: (sort: ResourceSortOptions) => void;
}

const automaticSortOptions: ResourceSortBy[] = [
  'updated_at',
  'created_at',
  'title',
];

const flatAutomaticSortOptions = automaticSortOptions.flatMap(sortBy =>
  getShareSortOrderOptions(sortBy).map(order => ({
    sort_by: sortBy,
    sort_order: order.value,
    fieldKey: `sidebar.sort.${sortBy}`,
    orderKey: `sidebar.sort.order.${order.labelKey}`,
  }))
);

export function ShareSortSelector({
  disabled,
  manualSortAvailable,
  sort,
  onChange,
}: ShareSortSelectorProps) {
  const { t } = useTranslation();
  const selectedAutomaticOption = flatAutomaticSortOptions.find(
    option =>
      option.sort_by === sort.sort_by && option.sort_order === sort.sort_order
  );
  const manualItem = (
    <DropdownMenuItem
      aria-disabled={!manualSortAvailable}
      aria-current={sort.sort_by === 'manual' ? 'true' : undefined}
      className={cn(
        'h-9 cursor-pointer gap-2 text-popover-foreground',
        sort.sort_by === 'manual' && 'bg-accent',
        !manualSortAvailable && 'cursor-not-allowed opacity-50'
      )}
      onSelect={event => {
        if (!manualSortAvailable) {
          event.preventDefault();
          return;
        }
        onChange({ sort_by: 'manual', sort_order: 'asc' });
      }}
    >
      <span className="flex w-full items-center justify-between gap-x-3">
        <span>{t('sidebar.sort.manual')}</span>
        <span className="flex size-4">
          {sort.sort_by === 'manual' && (
            <Check className="size-4 text-blue-500" />
          )}
        </span>
      </span>
    </DropdownMenuItem>
  );

  return (
    <TooltipProvider>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className="h-6 w-44 justify-between bg-transparent px-3 py-2 text-sm font-normal dark:bg-[#303030]"
          >
            <span className="truncate">
              {selectedAutomaticOption
                ? `${t(selectedAutomaticOption.fieldKey)} ${t(
                    selectedAutomaticOption.orderKey
                  )}`
                : t('sidebar.sort.manual')}
            </span>
            <ChevronDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-max">
          {flatAutomaticSortOptions.map(option => {
            const selected =
              sort.sort_by === option.sort_by &&
              sort.sort_order === option.sort_order;

            return (
              <DropdownMenuItem
                key={`${option.sort_by}-${option.sort_order}`}
                aria-current={selected ? 'true' : undefined}
                className={cn(
                  'h-9 cursor-pointer gap-2 text-popover-foreground',
                  selected && 'bg-accent'
                )}
                onSelect={() =>
                  onChange({
                    sort_by: option.sort_by,
                    sort_order: option.sort_order,
                  })
                }
              >
                <span className="grid w-full grid-cols-[max-content_max-content_max-content] items-center gap-x-3">
                  <span>{t(option.fieldKey)}</span>
                  <span>{t(option.orderKey)}</span>
                  <span className="flex size-4">
                    {selected && <Check className="size-4 text-blue-500" />}
                  </span>
                </span>
              </DropdownMenuItem>
            );
          })}
          {manualSortAvailable ? (
            manualItem
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>{manualItem}</TooltipTrigger>
              <TooltipContent side="left" className="max-w-52">
                {t('share.share.sort.manual_unavailable')}
              </TooltipContent>
            </Tooltip>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}
