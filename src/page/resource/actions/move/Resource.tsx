import { useTranslation } from 'react-i18next';

import ResourceIcon from '@/assets/icons/ResourceIcon';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import type { ResourceMeta, ResourceType, SpaceType } from '@/interface';
import { cn } from '@/lib/utils';

import { shouldDisableMoveTarget } from './utils';

interface IResource extends Pick<
  ResourceMeta,
  'id' | 'name' | 'parent_id' | 'resource_type' | 'has_children' | 'attrs'
> {
  spaceType?: SpaceType;
}

interface IProps {
  data: IResource;
  resourceIds: string[];
  sourceResourceType?: ResourceType;
  disabled?: boolean;
  disabledTooltip?: string;
  editId: string;
  onEditId: (editId: string) => void;
  onSearch: (val: string) => void;
  onFinished?: (
    resourceIds: string[],
    targetId: string,
    targetName?: string,
    targetResource?: IResource
  ) => void;
}

export default function Resource(props: IProps) {
  const {
    data,
    editId,
    onEditId,
    resourceIds,
    sourceResourceType,
    disabled: disabledByProps,
    disabledTooltip,
    onSearch,
    onFinished,
  } = props;
  const { t } = useTranslation();
  const resourceName = data.name || t('untitled');
  let name = resourceName;
  if ((!data.parent_id || data.parent_id === '0') && data.spaceType) {
    name = t(data.spaceType);
  }
  const isMoving = data.id === editId;
  const disabledByResourceType = shouldDisableMoveTarget(
    sourceResourceType,
    data.resource_type
  );
  const disabled = Boolean(
    isMoving || disabledByProps || disabledByResourceType
  );
  const handleMove = () => {
    if (disabled) {
      return;
    }

    onEditId(data.id);
    onEditId('');
    onSearch('');
    onFinished?.(resourceIds, data.id, name, data);
  };

  const button = (
    <Button
      variant="ghost"
      disabled={disabled}
      className={cn(
        'flex h-auto w-full items-start justify-start whitespace-normal rounded-none font-normal',
        (disabledByProps || disabledByResourceType) && 'opacity-50'
      )}
      onClick={handleMove}
    >
      {isMoving ? (
        <Spinner />
      ) : (
        <span className="size-4 shrink-0 [&>svg]:size-4">
          <ResourceIcon expand={false} resource={data} />
        </span>
      )}
      <div className="flex-1 break-all text-left">{name}</div>
    </Button>
  );

  const tooltipContent = disabledByResourceType
    ? t('smart_folder.move.unsupported_mixed_target')
    : disabledByProps
      ? disabledTooltip
      : undefined;

  if (!tooltipContent) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="block">{button}</span>
      </TooltipTrigger>
      <TooltipContent>{tooltipContent}</TooltipContent>
    </Tooltip>
  );
}
