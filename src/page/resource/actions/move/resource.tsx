import { File, Folder } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import useApp from '@/hooks/use-app';
import type { Resource, SpaceType } from '@/interface';

interface IResource extends Resource {
  spaceType?: SpaceType;
}

interface IProps {
  data: IResource;
  resourceId: string;
  namespaceId: string;
  editId: string;
  onEditId: (editId: string) => void;
  onSearch: (val: string) => void;
  onFinished?: (resouceId: string, targetId: string) => void;
}

export default function Resource(props: IProps) {
  const { data, editId, onEditId, resourceId, onSearch, onFinished } = props;
  const app = useApp();
  const { t } = useTranslation();
  const resourceName = data.name || t('untitled');
  let name = resourceName;
  if ((!data.parent_id || data.parent_id === '0') && data.spaceType) {
    name = t(data.spaceType);
  }

  return (
    <Button
      variant="ghost"
      disabled={data.id === editId}
      className="flex h-auto w-full items-start justify-start whitespace-normal rounded-none font-normal"
      onClick={() => {
        onEditId(data.id);
        app.fire('move_resource_start');
        onEditId('');
        onSearch('');
        onFinished && onFinished(resourceId, data.id);
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
}
