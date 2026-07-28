import { ArrowLeft, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import Loading from '@/components/loading';
import { Markdown } from '@/components/markdown';
import { Button } from '@/components/ui/Button';
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
  const navigate = useNavigate();
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

  const backToFolder = () => navigate(`/${namespaceId}/${resourceId}`);

  if (notFound || !item) {
    return (
      <div>
        <Button variant="ghost" className="mb-6 px-0" onClick={backToFolder}>
          <ArrowLeft className="mr-2 size-4" />
          {t('rss_folder.reader.back')}
        </Button>
        <div className="mt-12 text-center text-muted-foreground">
          {t('rss_folder.reader.not_found')}
        </div>
      </div>
    );
  }

  return (
    <div data-resource-export-content="true">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Button variant="ghost" className="px-0" onClick={backToFolder}>
          <ArrowLeft className="mr-2 size-4" />
          {t('rss_folder.reader.back')}
        </Button>
        {item.url && (
          <Button variant="outline" size="sm" asChild>
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              {t('rss_folder.reader.open_original')}
              <ExternalLink className="ml-2 size-4" />
            </a>
          </Button>
        )}
      </div>
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
