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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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

export function ShareSortSelector({
  disabled,
  manualSortAvailable,
  sort,
  onChange,
}: ShareSortSelectorProps) {
  const { t } = useTranslation();
  const manualItem = (
    <DropdownMenuItem
      aria-disabled={!manualSortAvailable}
      aria-current={sort.sort_by === 'manual' ? 'true' : undefined}
      className={cn(
        'h-9 justify-between',
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
      {t('sidebar.sort.manual')}
      {sort.sort_by === 'manual' && <Check className="size-4 text-blue-500" />}
    </DropdownMenuItem>
  );

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
          {automaticSortOptions.map(sortBy => {
            const selected = sort.sort_by === sortBy;
            const orders = getShareSortOrderOptions(sortBy);
            return (
              <DropdownMenuSub key={sortBy}>
                <DropdownMenuSubTrigger
                  aria-current={selected ? 'true' : undefined}
                  className={cn('h-9', selected && 'bg-accent')}
                >
                  {t(`sidebar.sort.${sortBy}`)}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-36">
                  {orders.map(order => {
                    const orderSelected =
                      selected && sort.sort_order === order.value;
                    return (
                      <DropdownMenuItem
                        key={order.value}
                        aria-current={orderSelected ? 'true' : undefined}
                        className="h-9 justify-between"
                        onSelect={() =>
                          onChange({
                            sort_by: sortBy,
                            sort_order: order.value,
                          })
                        }
                      >
                        {t(`sidebar.sort.order.${order.labelKey}`)}
                        {orderSelected && (
                          <Check className="size-4 text-blue-500" />
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
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
