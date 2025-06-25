import { Resource } from '@/interface';
import Render from '@/page/resource/render';
import Editor from '@/page/resource/editor';
import { useTranslation } from 'react-i18next';
import Attributes from '@/components/attributes';

interface IProps {
  editPage: boolean;
  resource: Resource;
  onResource: (resource: Resource) => void;
}

export default function Page(props: IProps) {
  const { editPage, resource, onResource } = props;
  const { t } = useTranslation();

  if (editPage) {
    return <Editor resource={resource} onResource={onResource} />;
  }

  return (
    <>
      <h1 className="text-4xl font-bold mb-4">
        {resource.name || t('untitled')}
      </h1>
      <Attributes resource={resource} />
      <Render content={resource.content || ''} />
    </>
  );
}
