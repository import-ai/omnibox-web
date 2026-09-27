import { format } from 'date-fns';
import { ChevronDown, Paperclip } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

import ExecutionStatus from './ExecutionStatus';
import {
  ExecutionEvent,
  LocalExecution,
  mergeEvents,
  runtimeApi,
  terminal,
} from './runtime';

const time = (value: string) => format(new Date(value), 'yyyy-MM-dd HH:mm:ss');

function Field({
  label,
  children,
  nowrap = false,
}: {
  label: string;
  children: ReactNode;
  nowrap?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          'text-sm text-foreground',
          nowrap ? 'whitespace-nowrap' : 'break-all'
        )}
      >
        {children}
      </span>
    </div>
  );
}

function Artifact({ data }: { data: string }) {
  try {
    const artifact = JSON.parse(data);
    const url = new URL(artifact.url);
    if (!['https:', 'http:'].includes(url.protocol)) return null;
    return (
      <a
        className="inline-flex h-6 max-w-full items-center gap-1 rounded-lg border border-border px-2 text-xs font-medium text-foreground hover:bg-muted"
        href={url.href}
        target="_blank"
        rel="noreferrer"
      >
        <Paperclip className="size-3 shrink-0 text-muted-foreground" />
        <span className="truncate">{String(artifact.name)}</span>
      </a>
    );
  } catch {
    return null;
  }
}

export default function ExecutionCard({
  execution: e,
  deviceName,
  refresh,
  bordered = true,
}: {
  execution: LocalExecution;
  deviceName: string;
  refresh: () => void;
  bordered?: boolean;
}) {
  const { t } = useTranslation();
  const [events, setEvents] = useState<ExecutionEvent[]>([]);
  const [open, setOpen] = useState(!terminal.has(e.status));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let sequence = 0;
    const load = async () => {
      try {
        let page: ExecutionEvent[];
        do {
          page = await runtimeApi.events(e.id, sequence);
          if (!active) return;
          const batch = page;
          setEvents(old => mergeEvents(old, batch));
          if (page.length) sequence = page[page.length - 1].sequence;
        } while (page.length === 100);
        setError('');
      } catch (err) {
        if (active) setError(String(err));
      } finally {
        if (active && !terminal.has(e.status)) timer = setTimeout(load, 1000);
      }
    };
    void load();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [e.id, e.status, open]);
  const action = async (operation: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await operation();
      refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  };
  const expired =
    !!e.approval_expires_at && Date.parse(e.approval_expires_at) <= Date.now();
  const output = events
    .filter(v => v.kind !== 'artifact' && v.kind !== 'status')
    .map(v => v.data)
    .join('');
  const artifacts = events.filter(v => v.kind === 'artifact');
  return (
    <article
      className={cn(
        'flex flex-col gap-3 text-sm',
        bordered && 'rounded-md border border-border p-4'
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate font-semibold text-foreground">
          {deviceName}
        </span>
        <ExecutionStatus status={e.status} />
      </div>
      <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-xs text-foreground">
        {e.command}
      </pre>
      <div className="flex flex-wrap gap-x-8 gap-y-2">
        <Field label={t('local_runtime.cwd')}>{e.cwd}</Field>
        <Field label={t('local_runtime.timeout')} nowrap>
          {t('local_runtime.timeout_value', { count: e.timeout_seconds })}
        </Field>
        <Field label={t('local_runtime.created_at')} nowrap>
          {time(e.created_at)}
        </Field>
        {e.exit_code !== null && (
          <Field label={t('local_runtime.exit_code')} nowrap>
            {e.exit_code}
          </Field>
        )}
      </div>
      {e.approvals?.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">
            {t('local_runtime.approvals')}
          </span>
          {e.approvals.map((approval, index) => (
            <span key={index} className="flex gap-3 text-sm text-foreground">
              <span>
                {t(
                  `local_runtime.decision.${approval.decision === 'approve' ? 'approve' : 'reject'}`
                )}
              </span>
              <span className="text-muted-foreground">{time(approval.at)}</span>
            </span>
          ))}
        </div>
      )}
      {artifacts.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">
            {t('local_runtime.artifacts')}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {artifacts.map(v => (
              <Artifact key={v.sequence} data={v.data} />
            ))}
          </div>
        </div>
      )}
      {open && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">
            {t('local_runtime.output')}
          </span>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-md border border-border px-3 py-2 font-mono text-xs text-foreground">
            {output || (
              <span className="font-sans text-muted-foreground">
                {t('local_runtime.no_output')}
              </span>
            )}
          </pre>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {t(open ? 'local_runtime.hide_output' : 'local_runtime.show_output')}
          <ChevronDown
            className={cn(
              'size-3.5 transition-transform',
              open && 'rotate-180'
            )}
          />
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {e.status === 'awaiting_approval' &&
            (expired ? (
              <span className="text-xs text-muted-foreground">
                {t('local_runtime.expired')}
              </span>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void action(() => runtimeApi.decide(e.id, 'reject'))
                  }
                >
                  {t('local_runtime.reject')}
                </Button>
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    void action(() => runtimeApi.decide(e.id, 'approve'))
                  }
                >
                  {t('local_runtime.approve')}
                </Button>
              </>
            ))}
          {!terminal.has(e.status) && e.status !== 'awaiting_approval' && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy || e.status === 'cancel_requested'}
              onClick={() => void action(() => runtimeApi.cancel(e.id))}
            >
              {t('local_runtime.cancel')}
            </Button>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </article>
  );
}
