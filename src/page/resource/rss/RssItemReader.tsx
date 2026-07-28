import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Loading from '@/components/loading';
import { Markdown } from '@/components/markdown';
import { RssItemDetail } from '@/interface';
import { fetchRssItem } from '@/service/resource';

interface IProps {
  namespaceId: string;
  resourceId: string;
  itemId: string;
}

export default function RssItemReader({
  namespaceId,
  resourceId,
  itemId,
}: IProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [item, setItem] = useState<RssItemDetail | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setNotFound(false);
    fetchRssItem(namespaceId, resourceId, itemId, controller.signal)
      .then(setItem)
      .catch(error => {
        if (error?.response?.status === 404) {
          setNotFound(true);
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [itemId, namespaceId, resourceId]);

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
