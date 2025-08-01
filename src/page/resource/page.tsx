import { Resource } from '@/interface';
import Folder from '@/page/resource/folder';
import Render from '@/page/resource/render';
import Editor from '@/page/resource/editor';
import { useTranslation } from 'react-i18next';
import Attributes from '@/components/attributes';

interface IProps {
  editPage: boolean;
  resource: Resource;
  namespaceId: string;
  onResource: (resource: Resource) => void;
}

export default function Page(props: IProps) {
  const { editPage, resource, onResource, namespaceId } = props;
  const { t } = useTranslation();

  if (editPage) {
    return (
      <Editor
        resource={resource}
        onResource={onResource}
        namespaceId={namespaceId}
      />
    );
  }

  return (
    <>
      <h1 className="text-4xl font-bold mb-4">
        {resource.name || t('untitled')}
      </h1>
      <Attributes namespaceId={namespaceId} resource={resource} />
      {resource.resource_type === 'folder' ? (
        <Folder resource={resource} namespaceId={namespaceId} />
      ) : (
        <Render resource={resource} />
      )}
    </>
  );
}
