import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Loading from '@/components/loading';
import { Separator } from '@/components/ui/Separator';
import { RssItem } from '@/interface';
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
  const [loading, onLoading] = useState(true);
  const [data, onData] = useState<RssItem[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    onLoading(true);
    fetchRssItems(namespaceId, resourceId, controller.signal)
      .then((res: RssItem[]) => {
        onData(res);
      })
      .catch(() => {
        // Request was cancelled or failed; leave the list empty.
      })
      .finally(() => {
        onLoading(false);
      });
    return () => {
      controller.abort();
    };
  }, [namespaceId, resourceId]);

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
        const clickable = !!item.url;
        return (
          <div key={item.id}>
            <div
              className={clickable ? 'cursor-pointer group' : 'group'}
              onClick={() => {
                if (item.url) {
                  window.open(item.url, '_blank', 'noopener,noreferrer');
                }
              }}
            >
              <h3 className="text-lg font-medium line-clamp-2 group-hover:text-blue-500">
                {item.title || t('untitled')}
              </h3>
              {item.summary && (
                <p className="mt-1 text-muted-foreground text-sm line-clamp-2 leading-relaxed">
                  {item.summary}
                </p>
              )}
              <p className="mt-1 text-muted-foreground text-xs font-light">
                {formatItemDate(item)}
              </p>
            </div>
            {index < data.length - 1 && <Separator className="my-4" />}
          </div>
        );
      })}
    </div>
  );
}
