import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Loading from '@/components/loading';
import { Separator } from '@/components/ui/Separator';
import useApp from '@/hooks/useApp';
import useWide from '@/hooks/useWide';
import { Resource } from '@/interface';
import { http } from '@/lib/request';
import { cn } from '@/lib/utils';
import Actions from '@/page/resource/actions';
import Page from '@/page/resource/Page';

import CopilotToggleButton from './CopilotToggleButton';

interface CitationResourcePreviewProps {
  namespaceId: string;
  resourceId: string;
  /** Parent Workspace already provides page padding + gutter. */
  flush?: boolean;
}

export default function CitationResourcePreview({
  namespaceId,
  resourceId,
  flush = false,
}: CitationResourcePreviewProps) {
  const app = useApp();
  const { t } = useTranslation();
  const { wide, onWide } = useWide();
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
    <main
      className={cn(
        'flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white dark:bg-background',
        flush ? 'm-0' : 'm-2'
      )}
    >
      <header className="flex min-h-12 shrink-0 flex-wrap items-center gap-2 px-3">
        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
          {resource?.name ?? t('copilot.preview')}
        </span>
        {resource && (
          <div className="ml-auto flex items-center gap-1">
            <Actions
              app={app}
              wide={wide}
              onWide={onWide}
              forbidden={false}
              editPage={false}
              loading={false}
              notFound={false}
              resourceId={resourceId}
              namespaceId={namespaceId}
              resource={resource}
              onResource={setResource}
            />
            <CopilotToggleButton hideWhenOpen namespaceId={namespaceId} />
          </div>
        )}
      </header>
      <Separator className="bg-[#F2F2F2] dark:bg-[#303132]" />
      <div className="no-scrollbar flex min-h-0 flex-1 justify-center overflow-y-auto p-4">
        <div
          className={cn('w-full max-w-[800px]', {
            'max-w-7xl': wide,
          })}
        >
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
