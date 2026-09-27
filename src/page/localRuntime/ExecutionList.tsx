import { format } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/tooltip';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { getRelatedTime } from '@/lib/time';

import ExecutionCard from './ExecutionCard';
import ExecutionStatus from './ExecutionStatus';
import { LocalDevice, LocalExecution, runtimeApi } from './runtime';

export default function ExecutionList({ devices }: { devices: LocalDevice[] }) {
  const { t, i18n } = useTranslation();
  const [executions, setExecutions] = useState<LocalExecution[]>([]);
  const [error, setError] = useState('');
  const [pages, setPages] = useState(1);
  const [revision, setRevision] = useState(0);
  const [selectedId, setSelectedId] = useState<string>();
  const refresh = useCallback(() => setRevision(v => v + 1), []);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const rows = (
          await Promise.all(
            Array.from({ length: pages }, (_, i) =>
              runtimeApi.executions(undefined, i * 100)
            )
          )
        ).flat();
        if (active) {
          setExecutions(rows);
          setError('');
        }
      } catch (err) {
        if (active) setError(String(err));
      } finally {
        if (active) timer = setTimeout(load, 5000);
      }
    };
    void load();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [pages, revision]);
  const deviceName = (id: string) =>
    devices.find(d => d.id === id)?.name ?? t('local_runtime.removed_device');
  const selected = executions.find(e => e.id === selectedId);
  return (
    <div className="flex flex-col">
      <div className="mb-2 flex items-center justify-between gap-2 lg:mb-4">
        <h3 className="text-sm font-semibold text-foreground lg:text-base">
          {t('local_runtime.executions')}
        </h3>
        <Button
          onClick={refresh}
          className="h-[30px] w-[71px] shrink-0 text-xs font-medium"
        >
          {t('common.refresh')}
        </Button>
      </div>
      {error && (
        <p role="alert" className="mb-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {executions.length === 0 ? (
        <div className="rounded-md border border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            {t('local_runtime.empty')}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <div className="flex h-8 items-center gap-4 border-b border-border bg-background px-4 text-xs font-medium text-muted-foreground lg:h-10 lg:text-sm">
            <div className="min-w-0 flex-[2]">
              {t('local_runtime.columns.command')}
            </div>
            <div className="min-w-0 flex-1">
              {t('local_runtime.columns.device')}
            </div>
            <div className="w-24 shrink-0">
              {t('local_runtime.columns.status')}
            </div>
            <div className="w-20 shrink-0 text-right">
              {t('local_runtime.columns.time')}
            </div>
          </div>
          <TooltipProvider>
            {executions.map(e => (
              <button
                key={e.id}
                type="button"
                className="flex h-12 w-full items-center gap-4 border-b border-border px-4 text-left last:border-b-0 hover:bg-muted/50"
                onClick={() => setSelectedId(e.id)}
              >
                <code className="min-w-0 flex-[2] truncate font-mono text-xs text-foreground">
                  {e.command}
                </code>
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {deviceName(e.device_id)}
                </span>
                <span className="w-24 shrink-0">
                  <ExecutionStatus status={e.status} />
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="w-20 shrink-0 truncate text-right text-xs font-medium text-muted-foreground">
                      {getRelatedTime(new Date(e.created_at), i18n)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {format(new Date(e.created_at), 'yyyy-MM-dd HH:mm:ss')}
                  </TooltipContent>
                </Tooltip>
              </button>
            ))}
          </TooltipProvider>
        </div>
      )}
      {executions.length === pages * 100 && (
        <Button
          variant="outline"
          className="mt-3 self-center"
          onClick={() => setPages(v => v + 1)}
        >
          {t('local_runtime.more')}
        </Button>
      )}
      <Dialog
        open={!!selected}
        onOpenChange={open => !open && setSelectedId(undefined)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('local_runtime.detail')}</DialogTitle>
          </DialogHeader>
          {selected && (
            <ExecutionCard
              key={selected.id}
              execution={selected}
              deviceName={deviceName(selected.device_id)}
              refresh={refresh}
              bordered={false}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
