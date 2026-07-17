import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Arrow } from '@/assets/icons/Arrow';
import ResourceIcon from '@/assets/icons/ResourceIcon';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';

import type { ResourcePickerResource } from './resourcePickerTypes';

interface ResourcePickerRowProps {
  canExpand: boolean;
  depth: number;
  expanded: boolean;
  loading: boolean;
  onSelect: () => void;
  onToggle: () => void;
  resource: ResourcePickerResource;
  selected: boolean;
}

function ResourceSelectButton({
  expanded,
  onSelect,
  resource,
  selected,
}: Pick<
  ResourcePickerRowProps,
  'expanded' | 'onSelect' | 'resource' | 'selected'
>) {
  const { t } = useTranslation();
  const name = resource.name || t('untitled');

  return (
    <Button
      type="button"
      variant={selected ? 'secondary' : 'ghost'}
      disabled={resource.disabled}
      aria-pressed={selected}
      className={cn(
        'flex h-auto w-full min-w-0 max-w-full items-center justify-start overflow-hidden rounded-md px-1 py-2 font-normal',
        resource.disabled && 'opacity-50'
      )}
      onClick={onSelect}
    >
      <span className="size-4 shrink-0 [&>svg]:size-4">
        <ResourceIcon expand={expanded} resource={resource} />
      </span>
      <span className="ml-2 min-w-0 flex-1 truncate text-left">{name}</span>
      {selected && <Check className="size-4 shrink-0 text-primary" />}
    </Button>
  );
}

export function ResourcePickerRow({
  canExpand,
  depth,
  expanded,
  loading,
  onSelect,
  onToggle,
  resource,
  selected,
}: ResourcePickerRowProps) {
  const { t } = useTranslation();
  const name = resource.name || t('untitled');
  const selectButton = (
    <ResourceSelectButton
      expanded={expanded}
      onSelect={onSelect}
      resource={resource}
      selected={selected}
    />
  );

  return (
    <div
      className="flex w-full min-w-0 max-w-full items-center overflow-hidden"
      style={{ paddingLeft: depth * 16 + 4, paddingRight: 8 }}
    >
      {canExpand ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7 shrink-0 text-neutral-400"
          aria-label={t(
            expanded
              ? 'resource_picker.collapse_resource'
              : 'resource_picker.expand_resource',
            { name }
          )}
          onClick={onToggle}
        >
          {loading ? (
            <Spinner />
          ) : (
            <Arrow
              className={cn('transition-transform', expanded && 'rotate-90')}
            />
          )}
        </Button>
      ) : (
        <span className="size-7 shrink-0" />
      )}
      {resource.disabledTooltip ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex min-w-0 flex-1 overflow-hidden">
              {selectButton}
            </span>
          </TooltipTrigger>
          <TooltipContent>{resource.disabledTooltip}</TooltipContent>
        </Tooltip>
      ) : (
        <span className="flex min-w-0 flex-1 overflow-hidden">
          {selectButton}
        </span>
      )}
    </div>
  );
}
