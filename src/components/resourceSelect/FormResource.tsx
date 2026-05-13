import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import ResourceTypeIcon from '@/components/resource-type-icon';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Resource } from '@/interface';
import { cn } from '@/lib/utils';

interface IProps {
  data: Resource;
  resourceId: string;
  disabledIds?: string[];
  disabledTooltip?: string;
  onSearch: (val: string) => void;
  onChange: (val: string, key?: string) => void;
}

export default function FormResource({
  data,
  resourceId,
  disabledIds = [],
  disabledTooltip,
  onSearch,
  onChange,
}: IProps) {
  const { t } = useTranslation();
  const disabled = disabledIds.includes(data.id) ?? false;
  const resourceName = data.name || t('untitled');
  let name = resourceName;
  if ((!data.parent_id || data.parent_id === '0') && data.space_type) {
    name = data.space_type === 'private' ? t('private') : t('teamspace');
  }
  const handleClick = () => {
    onChange(data.id, 'resourceId');
    onSearch('');
  };

  const item = (
    <DropdownMenuItem
      onSelect={event => {
        if (disabled) {
          event.preventDefault();
          return;
        }
        handleClick();
      }}
      title={disabled ? disabledTooltip : undefined}
      className={cn(
        'cursor-pointer justify-between rounded-lg py-2 hover:bg-gray-100 dark:text-white dark:hover:bg-neutral-900',
        {
          'bg-gray-100 dark:bg-neutral-900': data.id === resourceId,
          'cursor-not-allowed opacity-50': disabled,
        }
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <ResourceTypeIcon resource={data} />
        <span className="min-w-0 flex-1 truncate text-neutral-900 dark:text-white">
          {name}
        </span>
      </div>
      {data.id === resourceId && (
        <Check className="size-5 shrink-0 text-neutral-900" />
      )}
    </DropdownMenuItem>
  );

  if (!disabled || !disabledTooltip) return item;

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <div>{item}</div>
      </TooltipTrigger>
      <TooltipContent>{disabledTooltip}</TooltipContent>
    </Tooltip>
  );
}
