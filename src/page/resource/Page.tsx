import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';

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
import { splitSearchText } from '@/page/resource/searchHighlight';

interface IProps {
  editPage: boolean;
  resource: Resource;
  namespaceId: string;
  wide: boolean;
  onResource: (resource: Resource) => void;
  rssItemId?: string | null;
  onRssItemCopyContentChange?: (value: {
    itemId: string;
    content: string | null | undefined;
  }) => void;
}

export default function Page(props: IProps) {
  const {
    editPage,
    resource,
    onResource,
    namespaceId,
    wide,
    rssItemId: explicitRssItemId,
    onRssItemCopyContentChange,
  } = props;
  const { t } = useTranslation();
  const useOmniboxEditor = useResourceStore(selectUseOmniboxEditor);
  const constrainHeader =
    useOmniboxEditor &&
    resource.resource_type !== 'folder' &&
    resource.resource_type !== 'smart_folder' &&
    resource.resource_type !== 'rss_folder';
  const constrainFolderContent =
    resource.resource_type === 'folder' ||
    resource.resource_type === 'smart_folder' ||
    resource.resource_type === 'rss_folder';
  const { rss_item_id: routeRssItemId } = useParams();
  const rssItemId =
    explicitRssItemId === undefined
      ? routeRssItemId
      : explicitRssItemId || undefined;
  const [searchParams] = useSearchParams();
  const search = searchParams.get('query') ?? '';
  const title = resource.name || t('untitled');

  if (editPage) {
    return (
      <Editor
        resource={resource}
        onResource={onResource}
        namespaceId={namespaceId}
        wide={wide}
      />
    );
  }

  if (resource.resource_type === 'rss_folder' && rssItemId) {
    return (
      <RssItemReader
        namespaceId={namespaceId}
        resourceId={resource.id}
        itemId={rssItemId}
        notifyItemLoaded
        onCopyContentChange={onRssItemCopyContentChange}
      />
    );
  }

  return (
    <div
      data-resource-export-content="true"
      className={cn(
        constrainFolderContent && !wide && 'mx-auto w-full max-w-[680px]'
      )}
    >
      <div
        className={cn(
          constrainHeader && 'resource-readonly-page-header',
          constrainHeader && wide && 'resource-readonly-page-header--wide'
        )}
      >
        <h1 className="resource-search-title mb-4 min-w-0 max-w-full break-all text-[34px] font-bold">
          {splitSearchText(title, search).map((part, index) =>
            part.match ? (
              <mark className="search-query-mark" key={index}>
                {part.text}
              </mark>
            ) : (
              part.text
            )
          )}
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
          wide={wide}
          linkBase={`/${namespaceId}/${resource.id}`}
          style={{ overflow: 'inherit' }}
        />
      )}
    </div>
  );
}
