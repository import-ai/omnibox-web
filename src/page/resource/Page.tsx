import { useState } from 'react';
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
import { RSS_ITEM_SORT } from '@/service/resourceSort';

import { ResourceCommentsSheet } from './comments/ResourceCommentsSheet';
import {
  type ResourceCommentsController,
  useResourceComments,
} from './comments/useResourceComments';

interface IProps {
  editPage: boolean;
  resource: Resource;
  namespaceId: string;
  showToc: boolean;
  scrollToLine?: number;
  wide: boolean;
  onResource: (resource: Resource) => void;
}

interface PageContentProps extends IProps {
  comments: ResourceCommentsController;
  onContentDirtyChange: (dirty: boolean) => void;
}

function PageContent(props: PageContentProps) {
  const {
    editPage,
    resource,
    onResource,
    namespaceId,
    showToc,
    scrollToLine,
    wide,
    comments,
    onContentDirtyChange,
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
  const [searchParams] = useSearchParams();
  const search = searchParams.get('query') ?? '';
  const title = resource.name || t('untitled');

  // Read-only resources (rss items) have no editor, even on the /edit route.
  if (editPage && !resource.read_only) {
    return (
      <Editor
        comments={comments}
        onContentDirtyChange={onContentDirtyChange}
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
        <Folder
          resourceId={resource.id}
          apiPrefix={`/namespaces/${namespaceId}/resources`}
          namespaceId={namespaceId}
          emptyText={t('rss_folder.empty')}
          navigationPrefix={`/${namespaceId}`}
          sort={RSS_ITEM_SORT}
          rssFeedNames
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
          comments={comments}
          namespaceId={namespaceId}
          resource={resource}
          showToc={showToc}
          scrollToLine={scrollToLine}
          wide={wide}
          linkBase={`/${namespaceId}/${resource.id}`}
          style={{ overflow: 'inherit' }}
        />
      )}
    </div>
  );
}

export default function Page(props: IProps) {
  const { editPage, namespaceId, resource } = props;
  const useOmniboxEditor = useResourceStore(selectUseOmniboxEditor);
  const [contentDirty, setContentDirty] = useState(false);
  const commentsEnabled =
    useOmniboxEditor &&
    !!namespaceId &&
    resource.resource_type !== 'folder' &&
    resource.resource_type !== 'smart_folder' &&
    resource.resource_type !== 'rss_folder';
  const comments = useResourceComments({
    namespaceId,
    resource,
    enabled: commentsEnabled,
    contentDirty: editPage && contentDirty,
  });

  return (
    <>
      <PageContent
        {...props}
        comments={comments}
        onContentDirtyChange={setContentDirty}
      />
      {commentsEnabled ? <ResourceCommentsSheet controller={comments} /> : null}
    </>
  );
}
