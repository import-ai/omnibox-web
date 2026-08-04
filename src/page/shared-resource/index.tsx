import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import Attributes from '@/components/attributes';
import Loading from '@/components/loading';
import { useSidebar } from '@/components/ui/Sidebar';
import { cn, setDocumentTitle } from '@/lib/utils';
import DeletedResourcePage from '@/page/auth/DeletedResourcePage';
import { fetchShareRssItem, fetchShareRssItems } from '@/service/share';

import Folder from '../resource/folder';
import Render from '../resource/Render';
import RssItems from '../resource/rss';
import RssItemReader from '../resource/rss/RssItemReader';
import { useShareContext } from '../share';

export default function SharedResourcePage() {
  const { t } = useTranslation();
  const { rss_item_id: rssItemId } = useParams();
  const { notFound, shareInfo, resource, setRssItem, wide } = useShareContext();
  const { open } = useSidebar();
  const [large, onLarge] = useState(window.innerWidth > 1500);

  useEffect(() => {
    if (resource?.name) {
      setDocumentTitle(resource.name);
    }
  }, [resource?.name]);

  useEffect(() => {
    function handleSize() {
      onLarge(window.innerWidth > 1500);
    }
    window.addEventListener('resize', handleSize);
    return () => {
      window.removeEventListener('resize', handleSize);
    };
  }, []);

  if (notFound) {
    return <DeletedResourcePage />;
  }

  if (!shareInfo || !resource) {
    return <Loading />;
  }

  // Reading a single item of a shared rss folder: the reader takes over the
  // whole body (no folder title/attributes), mirroring the authenticated app.
  const isRssItemReader =
    resource.resource_type === 'rss_folder' && Boolean(rssItemId);

  return (
    <div className="flex h-full w-full min-w-0 justify-center overflow-y-auto overflow-x-hidden p-4">
      <div
        className={cn('flex min-w-0 w-full max-w-full flex-col', {
          'max-w-[680px]': !wide && (open || !large),
          'max-w-[800px]': !wide && (!open || large),
          'max-w-7xl': wide,
        })}
      >
        {isRssItemReader ? (
          <RssItemReader
            namespaceId={shareInfo.id}
            resourceId={resource.id}
            itemId={rssItemId!}
            fetchItem={signal =>
              fetchShareRssItem(shareInfo.id, resource.id, rssItemId!, signal)
            }
            onItemLoaded={setRssItem}
          />
        ) : (
          <>
            <h1 className="mb-4 min-w-0 max-w-full text-[34px] font-bold break-all">
              {resource.name || t('untitled')}
            </h1>
            <Attributes
              resource={resource as any}
              namespaceId={shareInfo.id}
              readOnly
            />
            {resource.resource_type === 'smart_folder' ? (
              <Folder
                resourceId={resource.id}
                apiPrefix={`/shares/${shareInfo.id}/resources`}
                namespaceId={shareInfo.id}
                emptyText={t('smart_folder.empty')}
                navigationPrefix={`/s/${shareInfo.id}`}
                loadAll
                smartFolderParentId={resource.id}
              />
            ) : resource.resource_type === 'folder' ? (
              <Folder
                resourceId={resource.id}
                apiPrefix={`/shares/${shareInfo.id}/resources`}
                namespaceId={shareInfo.id}
                navigationPrefix={`/s/${shareInfo.id}`}
              />
            ) : resource.resource_type === 'rss_folder' ? (
              <RssItems
                resourceId={resource.id}
                namespaceId={shareInfo.id}
                emptyText={t('rss_folder.empty')}
                navigationPrefix={`/s/${shareInfo.id}`}
                fetchItems={options =>
                  fetchShareRssItems(shareInfo.id, resource.id, options)
                }
              />
            ) : (
              <Render
                resource={resource}
                linkBase={`/s/${shareInfo.id}/${resource.id}`}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
