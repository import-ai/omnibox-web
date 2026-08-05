import { ArrowUpDown, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/DropdownMenu';
import { cn } from '@/lib/utils';
import type {
  ResourceSortBy,
  ResourceSortOptions,
  ResourceSortOrder,
} from '@/service/resource';

import { menuIconClass, menuItemClass } from './shared';

interface ResourceSortMenuProps {
  value: ResourceSortOptions;
  disabled: boolean;
  onChange: (value: ResourceSortOptions) => void;
}

const automaticSortOptions: ResourceSortBy[] = [
  'updated_at',
  'created_at',
  'title',
];

export function ResourceSortMenu({
  value,
  disabled,
  onChange,
}: ResourceSortMenuProps) {
  const { t } = useTranslation();

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger disabled={disabled} className={menuItemClass}>
        <ArrowUpDown className={menuIconClass} />
        {t('sidebar.sort.menu')}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-44">
        {automaticSortOptions.map(sortBy => {
          const selected = value.sort_by === sortBy;
          const orders: Array<{
            label: string;
            value: ResourceSortOrder;
          }> =
            sortBy === 'title'
              ? [
                  { label: t('sidebar.sort.order.az'), value: 'asc' },
                  { label: t('sidebar.sort.order.za'), value: 'desc' },
                ]
              : [
                  { label: t('sidebar.sort.order.newest'), value: 'desc' },
                  { label: t('sidebar.sort.order.oldest'), value: 'asc' },
                ];
          return (
            <DropdownMenuSub key={sortBy}>
              <DropdownMenuSubTrigger
                disabled={disabled}
                aria-current={selected ? 'true' : undefined}
                className={cn('h-9', selected && 'bg-accent')}
              >
                {t(`sidebar.sort.${sortBy}`)}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-36">
                {orders.map(order => {
                  const orderSelected =
                    selected && value.sort_order === order.value;
                  return (
                    <DropdownMenuItem
                      key={order.value}
                      disabled={disabled}
                      aria-current={orderSelected ? 'true' : undefined}
                      className="h-9 justify-between"
                      onSelect={() =>
                        onChange({
                          sort_by: sortBy,
                          sort_order: order.value,
                        })
                      }
                    >
                      {order.label}
                      {orderSelected && <Check className="text-blue-500" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          );
        })}
        <DropdownMenuItem
          disabled={disabled}
          aria-current={value.sort_by === 'manual' ? 'true' : undefined}
          className={cn(
            'h-9 justify-between',
            value.sort_by === 'manual' && 'bg-accent'
          )}
          onSelect={() => onChange({ sort_by: 'manual', sort_order: 'asc' })}
        >
          {t('sidebar.sort.manual')}
          {value.sort_by === 'manual' && <Check className="text-blue-500" />}
        </DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
