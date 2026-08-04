import { ArrowDown, ArrowUp, ArrowUpDown, Check } from 'lucide-react';
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

const sortOptions: ResourceSortBy[] = [
  'updated_at',
  'created_at',
  'title',
  'manual',
];

function getDefaultOrder(sortBy: ResourceSortBy): ResourceSortOrder {
  return sortBy === 'title' ? 'asc' : 'desc';
}

export function ResourceSortMenu({
  value,
  disabled,
  onChange,
}: ResourceSortMenuProps) {
  const { t } = useTranslation();

  const handleSelect = (sortBy: ResourceSortBy) => {
    if (sortBy !== value.sort_by) {
      onChange({
        sort_by: sortBy,
        sort_order: getDefaultOrder(sortBy),
      });
      return;
    }
    if (sortBy !== 'manual') {
      onChange({
        sort_by: sortBy,
        sort_order: value.sort_order === 'asc' ? 'desc' : 'asc',
      });
    }
  };

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger disabled={disabled} className={menuItemClass}>
        <ArrowUpDown className={menuIconClass} />
        {t('sidebar.sort.menu')}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-44">
        {sortOptions.map(sortBy => {
          const selected = value.sort_by === sortBy;
          return (
            <DropdownMenuItem
              key={sortBy}
              className={cn(
                'h-9 justify-between',
                selected && sortBy === 'manual' && 'bg-accent'
              )}
              disabled={disabled}
              aria-current={selected ? 'true' : undefined}
              onSelect={event => {
                event.preventDefault();
                handleSelect(sortBy);
              }}
            >
              {t(`sidebar.sort.${sortBy}`)}
              {selected &&
                sortBy !== 'manual' &&
                (value.sort_order === 'asc' ? (
                  <ArrowUp className="text-blue-500" />
                ) : (
                  <ArrowDown className="text-blue-500" />
                ))}
              {selected && sortBy === 'manual' && (
                <Check className="text-blue-500" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
