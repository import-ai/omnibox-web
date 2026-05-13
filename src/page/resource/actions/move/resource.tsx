import { File, Folder } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import useApp from '@/hooks/use-app';
import type { Resource, SpaceType } from '@/interface';
import { cn } from '@/lib/utils';

interface IResource extends Resource {
  spaceType?: SpaceType;
}

interface IProps {
  data: IResource;
  resourceIds: string[];
  namespaceId: string;
  editId: string;
  onEditId: (editId: string) => void;
  onSearch: (val: string) => void;
  disabled?: boolean;
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
    onSearch,
    disabled,
    onFinished,
  } = props;
  const app = useApp();
  const { t } = useTranslation();
  const resourceName = data.name || t('untitled');
  let name = resourceName;
  if ((!data.parent_id || data.parent_id === '0') && data.spaceType) {
    name = t(data.spaceType);
  }

  const content = (
    <Button
      variant="ghost"
      disabled={data.id === editId || disabled}
      className={cn(
        'flex h-auto w-full items-start justify-start whitespace-normal rounded-none font-normal',
        disabled && 'cursor-not-allowed opacity-50'
      )}
      onClick={() => {
        if (disabled) return;
        onEditId(data.id);
        app.fire('move_resource_start');
        onEditId('');
        onSearch('');
        onFinished && onFinished(resourceIds, data.id, name);
      }}
    >
      {data.id === editId ? (
        <Spinner />
      ) : data.resource_type === 'folder' ? (
        <Folder />
      ) : (
        <File />
      )}
      <div className="flex-1 break-all text-left">{name}</div>
    </Button>
  );

  if (!disabled) {
    return content;
  }

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <div>{content}</div>
      </TooltipTrigger>
      <TooltipContent>{t('batch.operating_resource')}</TooltipContent>
    </Tooltip>
  );
}
