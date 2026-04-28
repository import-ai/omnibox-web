import { File, Folder } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import useApp from '@/hooks/use-app';
import type { Resource, ResourceType, SpaceType } from '@/interface';
import { http } from '@/lib/request';
import { cn } from '@/lib/utils';

import { shouldDisableMoveTarget } from './utils';

interface IResource extends Resource {
  spaceType?: SpaceType;
}

interface IProps {
  data: IResource;
  resourceId: string;
  namespaceId: string;
  sourceResourceType?: ResourceType;
  editId: string;
  onEditId: (editId: string) => void;
  onSearch: (val: string) => void;
  onFinished?: (resouceId: string, targetId: string) => void;
}

export default function Resource(props: IProps) {
  const {
    data,
    editId,
    onEditId,
    resourceId,
    namespaceId,
    sourceResourceType,
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
  const disabled = isMoving || disabledByResourceType;
  const handleMove = () => {
    if (disabled) {
      return;
    }

    onEditId(data.id);
    app.fire('move_resource_start');
    http
      .post(
        `/namespaces/${namespaceId}/resources/${resourceId}/move/${data.id}`
      )
      .then(() => {
        onEditId('');
        onSearch('');
        onFinished && onFinished(resourceId, data.id);
      });
  };

  const button = (
    <Button
      variant="ghost"
      disabled={disabled}
      className={cn(
        'flex h-auto w-full items-start justify-start whitespace-normal rounded-none font-normal',
        disabledByResourceType && 'opacity-50'
      )}
      onClick={handleMove}
    >
      {isMoving ? (
        <Spinner />
      ) : data.resource_type === 'folder' ? (
        <Folder />
      ) : (
        <File />
      )}
      <div className="text-left break-all flex-1">{name}</div>
    </Button>
  );

  if (!disabledByResourceType) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="block">{button}</span>
      </TooltipTrigger>
      <TooltipContent>
        {t('smart_folder.move.unsupported_mixed_target')}
      </TooltipContent>
    </Tooltip>
  );
}
