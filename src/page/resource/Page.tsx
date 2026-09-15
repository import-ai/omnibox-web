import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

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
import { splitSearchText } from '@/page/resource/searchHighlight';
import { isFolderLikeResourceType } from '@/page/resource/useResourcePaneLayout';
import { RSS_ITEM_SORT } from '@/service/resourceSort';

interface IProps {
  editPage: boolean;
  resource: Resource;
  namespaceId: string;
  showToc: boolean;
  scrollToLine?: number;
  wide: boolean;
  onResource?: (resource: Resource) => void;
  readOnly?: boolean;
  apiPrefix?: string;
  navigationPrefix?: string;
  rssFeedNames?: boolean;
}

export default function Page(props: IProps) {
  const {
    editPage,
    resource,
    onResource,
    namespaceId,
    showToc,
    scrollToLine,
    wide,
    readOnly,
    apiPrefix,
    navigationPrefix,
    rssFeedNames,
  } = props;
  const { t } = useTranslation();
  const useOmniboxEditor = useResourceStore(selectUseOmniboxEditor);
  const folderLike = isFolderLikeResourceType(resource.resource_type);
  const constrainHeader = useOmniboxEditor && !folderLike;
  const constrainFolderContent = folderLike;
  const [searchParams] = useSearchParams();
  const search = searchParams.get('query') ?? '';
  const title = resource.name || t('untitled');
  const childrenApiPrefix =
    apiPrefix ??
    (resource.resource_type === 'smart_folder'
      ? `/namespaces/${namespaceId}/smart-folders`
      : `/namespaces/${namespaceId}/resources`);
  const childrenNavigationPrefix = navigationPrefix ?? `/${namespaceId}`;
  const showRssFeedNames = rssFeedNames ?? !apiPrefix;

  // Read-only resources (rss items) have no editor, even on the /edit route.
  if (editPage && !resource.read_only && onResource) {
    return (
      <Editor
        resource={resource}
        onResource={onResource}
        namespaceId={namespaceId}
        showToc={showToc}
        wide={wide}
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
          readOnly={readOnly}
        />
      </div>
      {resource.resource_type === 'smart_folder' ? (
        <Folder
          resourceId={resource.id}
          apiPrefix={childrenApiPrefix}
          namespaceId={namespaceId}
          emptyText={t('smart_folder.empty')}
          navigationPrefix={childrenNavigationPrefix}
          loadAll
          smartFolderParentId={resource.id}
        />
      ) : resource.resource_type === 'rss_folder' ? (
        <Folder
          resourceId={resource.id}
          apiPrefix={childrenApiPrefix}
          namespaceId={namespaceId}
          emptyText={t('rss_folder.empty')}
          navigationPrefix={childrenNavigationPrefix}
          sort={apiPrefix ? undefined : RSS_ITEM_SORT}
          rssFeedNames={showRssFeedNames}
        />
      ) : resource.resource_type === 'folder' ? (
        <Folder
          resourceId={resource.id}
          apiPrefix={childrenApiPrefix}
          namespaceId={namespaceId}
          navigationPrefix={childrenNavigationPrefix}
        />
      ) : (
        <Render
          resource={resource}
          showToc={showToc}
          scrollToLine={scrollToLine}
          wide={wide}
          linkBase={`${childrenNavigationPrefix}/${resource.id}`}
          style={{ overflow: 'inherit' }}
        />
      )}
    </div>
  );
}
