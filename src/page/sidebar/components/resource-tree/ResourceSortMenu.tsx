import { ArrowUpDown, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/ContextMenu';
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/DropdownMenu';
import { cn } from '@/lib/utils';
import type { ResourceSortOptions } from '@/service/resource';

import { menuIconClass, menuItemClass } from './shared';

interface ResourceSortMenuProps {
  value: ResourceSortOptions;
  disabled: boolean;
  onChange: (value: ResourceSortOptions) => void;
  variant?: 'context' | 'dropdown';
}

const automaticSortOptions: Array<
  ResourceSortOptions & { fieldKey: string; orderKey: string }
> = [
  {
    sort_by: 'updated_at',
    sort_order: 'asc',
    fieldKey: 'sidebar.sort.updated_at',
    orderKey: 'sidebar.sort.order.oldest',
  },
  {
    sort_by: 'updated_at',
    sort_order: 'desc',
    fieldKey: 'sidebar.sort.updated_at',
    orderKey: 'sidebar.sort.order.newest',
  },
  {
    sort_by: 'created_at',
    sort_order: 'asc',
    fieldKey: 'sidebar.sort.created_at',
    orderKey: 'sidebar.sort.order.oldest',
  },
  {
    sort_by: 'created_at',
    sort_order: 'desc',
    fieldKey: 'sidebar.sort.created_at',
    orderKey: 'sidebar.sort.order.newest',
  },
  {
    sort_by: 'title',
    sort_order: 'asc',
    fieldKey: 'sidebar.sort.title',
    orderKey: 'sidebar.sort.order.az',
  },
  {
    sort_by: 'title',
    sort_order: 'desc',
    fieldKey: 'sidebar.sort.title',
    orderKey: 'sidebar.sort.order.za',
  },
];

export function ResourceSortMenu({
  value,
  disabled,
  onChange,
  variant = 'dropdown',
}: ResourceSortMenuProps) {
  const { t } = useTranslation();
  const MenuItem = variant === 'context' ? ContextMenuItem : DropdownMenuItem;
  const MenuSub = variant === 'context' ? ContextMenuSub : DropdownMenuSub;
  const MenuSubContent =
    variant === 'context' ? ContextMenuSubContent : DropdownMenuSubContent;
  const MenuSubTrigger =
    variant === 'context' ? ContextMenuSubTrigger : DropdownMenuSubTrigger;

  return (
    <MenuSub>
      <MenuSubTrigger disabled={disabled} className={menuItemClass}>
        <ArrowUpDown className={menuIconClass} />
        {t('sidebar.sort.menu')}
      </MenuSubTrigger>
      <MenuSubContent className="w-max">
        {automaticSortOptions.map(option => {
          const selected =
            value.sort_by === option.sort_by &&
            value.sort_order === option.sort_order;

          return (
            <MenuItem
              key={`${option.sort_by}-${option.sort_order}`}
              disabled={disabled}
              aria-current={selected ? 'true' : undefined}
              className={cn(menuItemClass, 'h-9', selected && 'bg-accent')}
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
            </MenuItem>
          );
        })}
        <MenuItem
          disabled={disabled}
          aria-current={value.sort_by === 'manual' ? 'true' : undefined}
          className={cn(
            menuItemClass,
            'h-9',
            value.sort_by === 'manual' && 'bg-accent'
          )}
          onSelect={() => onChange({ sort_by: 'manual', sort_order: 'asc' })}
        >
          <span className="flex w-full items-center justify-between gap-x-3">
            <span>{t('sidebar.sort.manual')}</span>
            <span className="flex size-4">
              {value.sort_by === 'manual' && (
                <Check className="size-4 text-blue-500" />
              )}
            </span>
          </span>
        </MenuItem>
      </MenuSubContent>
    </MenuSub>
  );
}
