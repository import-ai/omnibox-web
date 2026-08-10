import { format } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import Loading from '@/components/loading';
import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/Separator';
import useApp from '@/hooks/useApp';
import { Resource, RssItem } from '@/interface';
import { navigateToResource } from '@/page/resource/resourceNavigation';
import { fetchRssItems } from '@/service/resource';

const PAGE_SIZE = 20;

interface IProps {
  resourceId: string;
  namespaceId: string;
  emptyText?: string;
  // Lets the shared view supply a share-scoped fetch; defaults to the
  // authenticated namespace endpoint.
  fetchItems?: (options: {
    offset: number;
    limit: number;
    signal?: AbortSignal;
  }) => Promise<RssItem[]>;
  // Base path for item navigation; defaults to the authenticated namespace path.
  navigationPrefix?: string;
}

// Renders published date if we have it, otherwise falls back to the time the
// item was first seen. RSS pubDate strings are RFC-822; the browser parses them.
function formatItemDate(item: RssItem): string {
  const raw = item.published_at || item.created_at;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return format(date, 'yyyy-MM-dd HH:mm:ss');
}

export default function RssItems(props: IProps) {
  const { resourceId, namespaceId, emptyText, fetchItems, navigationPrefix } =
    props;
  const { t } = useTranslation();
  const app = useApp();
  const navigate = useNavigate();
  const [loading, onLoading] = useState(true);
  const [loadingMore, onLoadingMore] = useState(false);
  const [data, onData] = useState<RssItem[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const itemNavigationPrefix = navigationPrefix ?? `/${namespaceId}`;

  // Fetches one page of items; the shared view injects its own share-scoped
  // fetch, everything else hits the authenticated namespace endpoint.
  const fetchPage = useCallback(
    (pageOffset: number, signal?: AbortSignal) =>
      fetchItems
        ? fetchItems({ offset: pageOffset, limit: PAGE_SIZE, signal })
        : fetchRssItems(namespaceId, resourceId, {
            offset: pageOffset,
            limit: PAGE_SIZE,
            signal,
          }),
    [namespaceId, resourceId, fetchItems]
  );

  const reload = useCallback(
    (signal?: AbortSignal) => {
      onLoading(true);
      setOffset(0);
      setHasMore(true);
      return fetchPage(0, signal)
        .then((res: RssItem[]) => {
          onData(res);
          setHasMore(res.length === PAGE_SIZE);
        })
        .catch(() => {
          // Request was cancelled or failed; leave the list empty.
        })
        .finally(() => {
          onLoading(false);
        });
    },
    [fetchPage]
  );

  useEffect(() => {
    const controller = new AbortController();
    reload(controller.signal);
    return () => {
      controller.abort();
    };
  }, [reload]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;

    onLoadingMore(true);
    const newOffset = offset + PAGE_SIZE;
    fetchPage(newOffset)
      .then((res: RssItem[]) => {
        onData(prevData => [...prevData, ...res]);
        setOffset(newOffset);
        setHasMore(res.length === PAGE_SIZE);
      })
      .catch(() => {
        // Leave the already-loaded items in place on failure.
      })
      .finally(() => {
        onLoadingMore(false);
      });
  }, [loadingMore, hasMore, offset, fetchPage]);

  useEffect(() => {
    return app.on('scroll-to-bottom', () => {
      if (hasMore && !loadingMore) {
        loadMore();
      }
    });
  }, [app, hasMore, loadingMore, loadMore]);

  // Editing the folder's links changes which items it has, so refetch when this
  // folder is updated.
  useEffect(() => {
    return app.on('update_resource', (delta: Resource) => {
      if (delta.id === resourceId) {
        reload();
      }
    });
  }, [app, resourceId, reload]);

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-4 pb-[30vh]">
      {data.length > 0 ? (
        <>
          {data.map((item, index) => {
            return (
              <div key={item.id}>
                <div
                  className="group cursor-pointer"
                  onClick={() =>
                    navigateToResource(
                      navigate,
                      `${itemNavigationPrefix}/${resourceId}/rss-items/${item.id}`
                    )
                  }
                >
                  <div className="flex items-start gap-2">
                    {item.link_name && (
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[4px] border text-[10px] font-normal leading-none">
                        {item.link_name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <h3 className="text-lg font-medium line-clamp-2 group-hover:text-blue-500">
                      {item.title || t('untitled')}
                    </h3>
                  </div>
                  <p className="mt-1 text-muted-foreground text-xs font-light">
                    {formatItemDate(item)}
                    {item.link_name && (
                      <span className="ml-1.5">{item.link_name}</span>
                    )}
                  </p>
                </div>
                {index < data.length - 1 && <Separator className="my-4" />}
              </div>
            );
          })}
          {hasMore && (
            <div className="pb-4 flex justify-center">
              <Button
                variant="secondary"
                className="block w-full"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? t('loading') : t('load_more')}
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="mt-12 text-center text-muted-foreground">
          {emptyText || t('no_pages_inside')}
        </div>
      )}
    </div>
  );
}
