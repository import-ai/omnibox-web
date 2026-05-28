import { File, Folder } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { SmartFolderDefaultIcon } from '@/assets/icons/SmartFolderDefaultIcon';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import useApp from '@/hooks/useApp';
import type { Resource, ResourceType, SpaceType } from '@/interface';
import { cn } from '@/lib/utils';

import { shouldDisableMoveTarget } from './utils';

interface IResource extends Resource {
  spaceType?: SpaceType;
}

interface IProps {
  data: IResource;
  resourceIds: string[];
  namespaceId: string;
  sourceResourceType?: ResourceType;
  disabled?: boolean;
  disabledTooltip?: string;
  editId: string;
  onEditId: (editId: string) => void;
  onSearch: (val: string) => void;
  onFinished?: (
    resourceIds: string[],
    targetId: string,
    targetName?: string
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
  const app = useApp();
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
    app.fire('move_resource_start');
    onEditId('');
    onSearch('');
    onFinished?.(resourceIds, data.id, name);
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
      ) : data.resource_type === 'smart_folder' ? (
        <SmartFolderDefaultIcon className="size-4" />
      ) : data.resource_type === 'folder' ? (
        <Folder />
      ) : (
        <File />
      )}
      <div className="flex-1 break-all text-left">{name}</div>
    </Button>
  );

  if (!disabledByResourceType && !disabledTooltip) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="block">{button}</span>
      </TooltipTrigger>
      <TooltipContent>
        {disabledByResourceType
          ? t('smart_folder.move.unsupported_mixed_target')
          : disabledTooltip}
      </TooltipContent>
    </Tooltip>
  );
}
