import { Clock3, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import App from '@/hooks/app.class';
import { Resource } from '@/interface';
import { http } from '@/lib/request';
import { cn } from '@/lib/utils';

interface ResourceRevision {
  id: string;
  resource_id: string;
  name: string;
  content: string;
  tag_ids: string[];
  created_at: string;
  updated_by_user_id: string | null;
}

interface ResourceHistoryProps {
  open: boolean;
  namespaceId: string;
  resource: Resource;
  app: App;
  onOpenChange: (open: boolean) => void;
  onResource: (resource: Resource) => void;
}

function formatContent(content: string, emptyText: string) {
  const trimmed = content.trim();
  if (!trimmed) {
    return emptyText;
  }
  return trimmed.length > 2000 ? `${trimmed.slice(0, 2000)}...` : trimmed;
}

export default function ResourceHistory(props: ResourceHistoryProps) {
  const { open, namespaceId, resource, app, onOpenChange, onResource } = props;
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [revisions, setRevisions] = useState<ResourceRevision[]>([]);

  const selectedRevision = useMemo(
    () => revisions.find(revision => revision.id === selectedId) || null,
    [revisions, selectedId]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    let canceled = false;
    setLoading(true);
    setError('');
    setRevisions([]);
    setSelectedId('');
    http
      .get<ResourceRevision[]>(
        `/namespaces/${namespaceId}/resources/${resource.id}/revisions`
      )
      .then((items: ResourceRevision[]) => {
        if (canceled) {
          return;
        }
        setRevisions(items);
        setSelectedId(items[0]?.id || '');
      })
      .catch(() => {
        if (!canceled) {
          setError(t('resource.revisions.load_failed'));
        }
      })
      .finally(() => {
        if (!canceled) {
          setLoading(false);
        }
      });

    return () => {
      canceled = true;
    };
  }, [open, namespaceId, resource.id, t]);

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(i18n.language, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));

  const handleRestore = () => {
    if (!selectedRevision) {
      return;
    }
    setRestoring(true);
    http
      .post<Resource>(
        `/namespaces/${namespaceId}/resources/${resource.id}/revisions/${selectedRevision.id}/restore`
      )
      .then((updated: Resource) => {
        app.fire('update_resource', updated);
        onResource(updated);
        toast.success(t('resource.revisions.restore_success'));
        onOpenChange(false);
      })
      .finally(() => {
        setRestoring(false);
      });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-hidden sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{t('resource.revisions.title')}</SheetTitle>
          <SheetDescription>
            {t('resource.revisions.description', { count: revisions.length })}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            {t('resource.revisions.loading')}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : revisions.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            {t('resource.revisions.empty')}
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[220px_1fr]">
            <div className="space-y-2 overflow-y-auto pr-1">
              {revisions.map(revision => (
                <button
                  key={revision.id}
                  type="button"
                  onClick={() => setSelectedId(revision.id)}
                  className={cn(
                    'flex w-full items-start gap-2 rounded-lg border p-3 text-left text-sm transition',
                    revision.id === selectedId
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted'
                  )}
                >
                  <Clock3 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {revision.name || t('untitled')}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {formatDate(revision.created_at)}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            {selectedRevision && (
              <div className="flex min-h-0 flex-col rounded-xl border bg-muted/20">
                <div className="border-b p-4">
                  <div className="text-sm font-medium">
                    {selectedRevision.name || t('untitled')}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatDate(selectedRevision.created_at)}
                  </div>
                </div>
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                  <section>
                    <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                      {t('resource.revisions.content')}
                    </h3>
                    <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-background p-3 text-xs leading-5">
                      {formatContent(
                        selectedRevision.content,
                        t('resource.revisions.empty_content')
                      )}
                    </pre>
                  </section>
                  <section className="text-xs">
                    <div className="rounded-lg bg-background p-3">
                      <div className="mb-1 font-semibold text-muted-foreground">
                        {t('resource.revisions.tags')}
                      </div>
                      {selectedRevision.tag_ids.length}
                    </div>
                  </section>
                </div>
                <div className="flex justify-end border-t p-4">
                  <Button onClick={handleRestore} disabled={restoring}>
                    {restoring ? <Spinner /> : <RotateCcw className="size-4" />}
                    {t('resource.revisions.restore')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
