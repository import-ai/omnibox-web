import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import Attributes from '@/components/attributes';
import { Resource } from '@/interface';
import { cn } from '@/lib/utils';
import Editor from '@/page/resource/editor';
import Folder from '@/page/resource/folder';
import Render from '@/page/resource/Render';
import {
  selectUseOmniboxEditor,
  useResourceStore,
} from '@/page/resource/resourceStore';
import RssItems from '@/page/resource/rss';
import RssItemReader from '@/page/resource/rss/RssItemReader';

interface IProps {
  editPage: boolean;
  resource: Resource;
  namespaceId: string;
  onResource: (resource: Resource) => void;
}

export default function Page(props: IProps) {
  const { editPage, resource, onResource, namespaceId } = props;
  const { t } = useTranslation();
  const useOmniboxEditor = useResourceStore(selectUseOmniboxEditor);
  const constrainHeader =
    useOmniboxEditor &&
    resource.resource_type !== 'folder' &&
    resource.resource_type !== 'smart_folder' &&
    resource.resource_type !== 'rss_folder';
  const { rss_item_id: rssItemId } = useParams();

  if (editPage) {
    return (
      <Editor
        resource={resource}
        onResource={onResource}
        namespaceId={namespaceId}
      />
    );
  }

  if (resource.resource_type === 'rss_folder' && rssItemId) {
    return (
      <RssItemReader
        namespaceId={namespaceId}
        resourceId={resource.id}
        itemId={rssItemId}
      />
    );
  }

  return (
    <div data-resource-export-content="true">
      <div className={cn(constrainHeader && 'resource-readonly-page-header')}>
        <h1 className="mb-4 min-w-0 max-w-full break-all text-[34px] font-bold">
          {resource.name || t('untitled')}
        </h1>
        <Attributes
          namespaceId={namespaceId}
          resource={resource}
          onResource={onResource}
        />
      </div>
      {resource.resource_type === 'smart_folder' ? (
        <Folder
          resourceId={resource.id}
          apiPrefix={`/namespaces/${namespaceId}/smart-folders`}
          namespaceId={namespaceId}
          emptyText={t('smart_folder.empty')}
          navigationPrefix={`/${namespaceId}`}
          loadAll
          smartFolderParentId={resource.id}
        />
      ) : resource.resource_type === 'rss_folder' ? (
        <RssItems
          resourceId={resource.id}
          namespaceId={namespaceId}
          emptyText={t('rss_folder.empty')}
        />
      ) : resource.resource_type === 'folder' ? (
        <Folder
          resourceId={resource.id}
          apiPrefix={`/namespaces/${namespaceId}/resources`}
          namespaceId={namespaceId}
          navigationPrefix={`/${namespaceId}`}
        />
      ) : (
        <Render
          resource={resource}
          linkBase={`/${namespaceId}/${resource.id}`}
          style={{ overflow: 'inherit' }}
        />
      )}
    </div>
  );
}
