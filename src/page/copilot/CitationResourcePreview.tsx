import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Loading from '@/components/loading';
import { Separator } from '@/components/ui/Separator';
import useApp from '@/hooks/useApp';
import { Resource } from '@/interface';
import { http } from '@/lib/request';
import Page from '@/page/resource/Page';

interface CitationResourcePreviewProps {
  namespaceId: string;
  resourceId: string;
}

export default function CitationResourcePreview({
  namespaceId,
  resourceId,
}: CitationResourcePreviewProps) {
  const app = useApp();
  const { t } = useTranslation();
  const [resource, setResource] = useState<Resource | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setResource(null);
    setError(false);
    http
      .get(`/namespaces/${namespaceId}/resources/${resourceId}`, { mute: true })
      .then((response: Resource) => active && setResource(response))
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [namespaceId, resourceId]);

  useEffect(() => {
    return app.on('update_resource', (delta: Resource) => {
      if (delta.id !== resourceId) return;
      setResource(current => (current ? { ...current, ...delta } : current));
    });
  }, [app, resourceId]);

  return (
    <main className="m-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white dark:bg-background">
      <header className="flex h-12 shrink-0 items-center gap-2 px-3">
        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
          {resource?.name ?? t('copilot.preview')}
        </span>
      </header>
      <Separator />
      <div className="no-scrollbar flex min-h-0 flex-1 justify-center overflow-y-auto p-4">
        <div className="w-full max-w-[800px]">
          {!resource && !error && <Loading />}
          {error && (
            <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
              {t('copilot.preview_error')}
            </div>
          )}
          {resource && (
            <Page
              editPage={false}
              namespaceId={namespaceId}
              onResource={setResource}
              resource={resource}
            />
          )}
        </div>
      </div>
    </main>
  );
}
