import { ArrowLeft, History, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useCopilotStore } from '@/page/copilot/copilotStore';
import type { ResourceRevisionSummary } from '@/service/resource';

import { useResourceHistoryStore } from './resourceHistoryStore';

interface ResourceHistoryPanelProps {
  namespaceId: string;
  resourceId: string;
}

function formatRevisionDate(value: string, language: string) {
  return new Intl.DateTimeFormat(
    language.startsWith('zh') ? 'zh-CN' : 'en-US',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    }
  ).format(new Date(value));
}

function setRevisionQuery(value: string | null) {
  const next = new URL(window.location.href);
  if (value) next.searchParams.set('revision', value);
  else next.searchParams.delete('revision');
  window.history.replaceState(window.history.state, '', next);
}

export default function ResourceHistoryPanel({
  namespaceId,
  resourceId,
}: ResourceHistoryPanelProps) {
  const { t, i18n } = useTranslation();
  const close = useCopilotStore(state => state.close);
  const showHome = useCopilotStore(state => state.showHome);
  const selectRevision = useResourceHistoryStore(state => state.selectRevision);
  const clearRevision = useResourceHistoryStore(state => state.clearRevision);
  const selected = useResourceHistoryStore(
    state => state.selections[`${namespaceId}:${resourceId}`]
  );
  const [revisions, setRevisions] = useState<ResourceRevisionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [loadingRevision, setLoadingRevision] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    import('@/service/resource')
      .then(({ fetchResourceRevisions }) =>
        fetchResourceRevisions(namespaceId, resourceId)
      )
      .then(items => active && setRevisions(items))
      .catch(() => active && setFailed(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [namespaceId, resourceId]);

  const chooseRevision = async (revisionId: string) => {
    if (revisionId === 'current') {
      clearRevision(namespaceId, resourceId);
      setRevisionQuery(null);
      return;
    }
    setLoadingRevision(revisionId);
    try {
      const { fetchResourceRevision } = await import('@/service/resource');
      const revision = await fetchResourceRevision(
        namespaceId,
        resourceId,
        revisionId
      );
      selectRevision(namespaceId, resourceId, revision);
      setRevisionQuery(revisionId);
    } finally {
      setLoadingRevision(null);
    }
  };

  const retry = () => {
    setFailed(false);
    setLoading(true);
    import('@/service/resource')
      .then(({ fetchResourceRevisions }) =>
        fetchResourceRevisions(namespaceId, resourceId)
      )
      .then(setRevisions)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white dark:bg-background">
      <header className="flex min-h-12 shrink-0 items-center gap-2 border-b border-border/60 px-3">
        <Button
          aria-label={t('resource.history.back_to_copilot')}
          onClick={() => showHome(namespaceId)}
          size="icon"
          variant="ghost"
        >
          <ArrowLeft />
        </Button>
        <History className="size-4 text-muted-foreground" />
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">
          {t('resource.history.title')}
        </h2>
        <Button
          aria-label={t('copilot.collapse')}
          onClick={() => close(namespaceId)}
          size="icon"
          variant="ghost"
        >
          <X />
        </Button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex justify-center py-8 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
          </div>
        ) : failed ? (
          <div className="space-y-3 py-8 text-center text-sm text-muted-foreground">
            <p>{t('resource.history.load_failed')}</p>
            <Button onClick={retry} size="sm" variant="outline">
              {t('resource.history.retry')}
            </Button>
          </div>
        ) : revisions.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t('resource.history.empty')}
          </p>
        ) : (
          <div className="space-y-1">
            {revisions.map(revision => {
              const active =
                revision.id === 'current'
                  ? !selected
                  : selected?.id === revision.id;
              return (
                <button
                  className={cn(
                    'flex w-full flex-col items-start gap-1 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
                    active && 'bg-accent'
                  )}
                  key={revision.id}
                  onClick={() => chooseRevision(revision.id)}
                  type="button"
                >
                  <span className="flex w-full items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {revision.name || t('resource.untitled')}
                    </span>
                    {revision.id === 'current' ? (
                      <span className="text-xs text-muted-foreground">
                        {t('resource.history.current')}
                      </span>
                    ) : loadingRevision === revision.id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : null}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatRevisionDate(revision.created_at, i18n.language)}
                    {revision.author ? ` · ${revision.author.username}` : ''}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
