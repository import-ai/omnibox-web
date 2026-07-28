import { format } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import Loading from '@/components/loading';
import { Separator } from '@/components/ui/Separator';
import useApp from '@/hooks/useApp';
import { Resource, RssItem } from '@/interface';
import { fetchRssItems } from '@/service/resource';

interface IProps {
  resourceId: string;
  namespaceId: string;
  emptyText?: string;
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
  const { resourceId, namespaceId, emptyText } = props;
  const { t } = useTranslation();
  const app = useApp();
  const navigate = useNavigate();
  const [loading, onLoading] = useState(true);
  const [data, onData] = useState<RssItem[]>([]);

  const reload = useCallback(
    (signal?: AbortSignal) => {
      onLoading(true);
      return fetchRssItems(namespaceId, resourceId, { signal })
        .then((res: RssItem[]) => {
          onData(res);
        })
        .catch(() => {
          // Request was cancelled or failed; leave the list empty.
        })
        .finally(() => {
          onLoading(false);
        });
    },
    [namespaceId, resourceId]
  );

  useEffect(() => {
    const controller = new AbortController();
    reload(controller.signal);
    return () => {
      controller.abort();
    };
  }, [reload]);

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

  if (data.length === 0) {
    return (
      <div className="mt-12 text-center text-muted-foreground">
        {emptyText || t('no_pages_inside')}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-[30vh]">
      {data.map((item, index) => {
        return (
          <div key={item.id}>
            <div
              className="group cursor-pointer"
              onClick={() =>
                navigate(`/${namespaceId}/${resourceId}/rss-items/${item.id}`)
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
              {item.summary && (
                <p className="mt-1 text-muted-foreground text-sm line-clamp-2 leading-relaxed">
                  {item.summary}
                </p>
              )}
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
    </div>
  );
}
