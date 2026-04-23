import axios from 'axios';
import { format } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import ResourceIcon from '@/assets/icons/resourceIcon';
import Loading from '@/components/loading';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import useApp from '@/hooks/use-app';
import { Resource, ResourceSummary } from '@/interface';
import { http } from '@/lib/request';

import { groupItemsByTimestamp } from '../utils';
import { FolderContent } from './content';

interface IProps {
  resourceId: string;
  apiPrefix: string;
  navigationPrefix: string;
}

const PAGE_SIZE = 10;

export default function Folder(props: IProps) {
  const { resourceId, apiPrefix, navigationPrefix } = props;
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const app = useApp();
  const [loading, onLoading] = useState(false);
  const [loadingMore, onLoadingMore] = useState(false);
  const [data, onData] = useState<Array<ResourceSummary>>([]);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    onLoading(true);
    onData([]);
    setOffset(0);
    setHasMore(true);
    const source = axios.CancelToken.source();
    http
      .get(
        `${apiPrefix}/${resourceId}/children?summary=true&offset=0&limit=${PAGE_SIZE}`,
        {
          cancelToken: source.token,
        }
      )
      .then((res: Array<ResourceSummary>) => {
        onData(res);
        setHasMore(res.length === PAGE_SIZE);
      })
      .finally(() => {
        onLoading(false);
      });
    return () => {
      source.cancel();
    };
  }, [apiPrefix, resourceId]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;

    onLoadingMore(true);
    const newOffset = offset + PAGE_SIZE;
    http
      .get(
        `${apiPrefix}/${resourceId}/children?summary=true&offset=${newOffset}&limit=${PAGE_SIZE}`
      )
      .then((res: Array<ResourceSummary>) => {
        onData(prevData => [...prevData, ...res]);
        setOffset(newOffset);
        setHasMore(res.length === PAGE_SIZE);
      })
      .finally(() => {
        onLoadingMore(false);
      });
  }, [loadingMore, hasMore, offset, apiPrefix, resourceId]);

  useEffect(() => {
    return app.on('scroll-to-bottom', () => {
      if (hasMore && !loadingMore) {
        loadMore();
      }
    });
  }, [hasMore, loadingMore, loadMore]);

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6 pb-[30vh]">
      {data.length > 0 ? (
        <>
          {groupItemsByTimestamp(data, i18n).map(([key, items]) => (
            <div key={key}>
              <div className="pb-4">
                <p className="ml-0.5 text-sm font-light text-muted-foreground">
                  {key}
                </p>
              </div>
              {items.map((item, index) => {
                const iconResource = {
                  id: item.id,
                  name: item.name,
                  resource_type: item.resource_type,
                  parent_id: '',
                  space_type: 'private',
                  has_children: !!item.has_children,
                  attrs: (item as any).attrs || {},
                } as unknown as Resource;
                return (
                  <div
                    className="group cursor-pointer"
                    key={item.id}
                    onClick={() => {
                      navigate(`${navigationPrefix}/${item.id}`);
                    }}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="text-muted-foreground [&>svg]:size-5">
                          <ResourceIcon
                            expand={false}
                            resource={iconResource}
                          />
                        </div>
                        <h3 className="line-clamp-2 truncate text-lg font-medium group-hover:text-blue-500">
                          {item.name || t('untitled')}
                        </h3>
                      </div>
                    </div>
                    {item.resource_type === 'folder' ? (
                      <FolderContent resource={item} apiPrefix={apiPrefix} />
                    ) : (
                      <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                        {item.updated_at
                          ? format(item.updated_at, 'yyyy-MM-dd HH:mm:ss')
                          : ''}
                      </p>
                    )}
                    {index < items.length - 1 && <Separator className="my-4" />}
                  </div>
                );
              })}
            </div>
          ))}
          {hasMore && (
            <div className="flex justify-center pb-4">
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
        <div className="mt-12 text-center text-gray-500">
          {t('no_pages_inside')}
        </div>
      )}
    </div>
  );
}
