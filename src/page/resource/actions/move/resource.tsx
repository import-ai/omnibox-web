import { http } from '@/lib/request';
import useApp from '@/hooks/use-app';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { Resource, SpaceType } from '@/interface';
import { LoaderCircle, File, Folder } from 'lucide-react';

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
  const {
    data,
    editId,
    onEditId,
    resourceId,
    namespaceId,
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

  return (
    <Button
      variant="ghost"
      disabled={data.id === editId}
      className="w-full flex h-auto whitespace-normal justify-start items-start font-normal rounded-none"
      onClick={() => {
        onEditId(data.id);
        app.fire('move_resource_start');
        http
          .post(
            `/namespaces/${namespaceId}/resources/${resourceId}/move/${data.id}`,
          )
          .then(() => {
            onEditId('');
            onSearch('');
            onFinished && onFinished(resourceId, data.id);
          });
      }}
    >
      {data.id === editId ? (
        <LoaderCircle className="transition-transform animate-spin" />
      ) : data.resource_type === 'folder' ? (
        <Folder />
      ) : (
        <File />
      )}
      <div className="text-left">{name}</div>
    </Button>
  );
}
