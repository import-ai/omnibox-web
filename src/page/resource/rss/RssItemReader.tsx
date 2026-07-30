import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PublishedTimeAttribute } from '@/components/attributes/PublishedTimeAttribute';
import { UrlAttribute } from '@/components/attributes/UrlAttribute';
import Loading from '@/components/loading';
import { Markdown } from '@/components/markdown';
import { RssItemDetail } from '@/interface';
import { fetchRssItem } from '@/service/resource';

interface IProps {
  namespaceId: string;
  resourceId: string;
  itemId: string;
  // Lets the shared view supply a share-scoped fetch; defaults to the
  // authenticated namespace endpoint.
  fetchItem?: (signal?: AbortSignal) => Promise<RssItemDetail>;
}

export default function RssItemReader({
  namespaceId,
  resourceId,
  itemId,
  fetchItem,
}: IProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [item, setItem] = useState<RssItemDetail | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    // Guards against a superseded request settling after the item switched: the
    // cleanup flips `active` off, so a late resolve/reject/abort from the old
    // request can no longer touch loading, item, or notFound and leave the reader
    // showing the previous article (or stuck out of its loading state).
    let active = true;
    setLoading(true);
    setNotFound(false);
    // Drop the previous article immediately so a slow or failing new request can
    // never render stale content underneath the loading state.
    setItem(null);
    const request = fetchItem
      ? fetchItem(controller.signal)
      : fetchRssItem(namespaceId, resourceId, itemId, controller.signal);
    request
      .then(result => {
        if (active) {
          setItem(result);
        }
      })
      .catch(error => {
        if (active && error?.response?.status === 404) {
          setNotFound(true);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [itemId, namespaceId, resourceId, fetchItem]);

  if (loading) {
    return <Loading />;
  }

  if (notFound || !item) {
    return (
      <div className="mt-12 text-center text-muted-foreground">
        {t('rss_folder.reader.not_found')}
      </div>
    );
  }

  return (
    <div data-resource-export-content="true">
      <h1 className="mb-6 min-w-0 max-w-full break-all text-[34px] font-bold">
        {item.title || t('untitled')}
      </h1>
      {(item.url || item.published_at) && (
        <div className="mb-6 space-y-2 text-sm">
          {item.url && <UrlAttribute url={item.url} />}
          {item.published_at && (
            <PublishedTimeAttribute publishedAt={item.published_at} />
          )}
        </div>
      )}
      {item.parsed_content === null ? (
        <div className="mt-12 text-center text-muted-foreground">
          {t('rss_folder.reader.not_ready')}
        </div>
      ) : (
        <div className="pb-[30vh]">
          <Markdown
            content={item.parsed_content}
            linkBase={item.url || undefined}
            openLinksInNewWindow
            style={{ overflow: 'inherit' }}
          />
        </div>
      )}
    </div>
  );
}
