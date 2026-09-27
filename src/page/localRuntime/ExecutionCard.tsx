import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';

import {
  ExecutionEvent,
  LocalExecution,
  mergeEvents,
  runtimeApi,
  terminal,
} from './runtime';

export default function ExecutionCard({
  execution: e,
  deviceName,
  refresh,
}: {
  execution: LocalExecution;
  deviceName: string;
  refresh: () => void;
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
  return (
    <article className="space-y-2 rounded-md border p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong>{deviceName}</strong>
        <span>{t(`local_runtime.status.${e.status}`)}</span>
      </div>
      <p className="break-all text-muted-foreground">
        {e.cwd} · {e.timeout_seconds}s ·{' '}
        {new Date(e.created_at).toLocaleString()}
      </p>
      <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-2">
        {e.command}
      </pre>
      {e.status === 'awaiting_approval' && (
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={busy || expired}
            onClick={() =>
              void action(() => runtimeApi.decide(e.id, 'approve'))
            }
          >
            {t('local_runtime.approve')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy || expired}
            onClick={() => void action(() => runtimeApi.decide(e.id, 'reject'))}
          >
            {t('local_runtime.reject')}
          </Button>
          {expired && <span>{t('local_runtime.expired')}</span>}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {t('local_runtime.output')}
        </Button>
        {!terminal.has(e.status) && (
          <Button
            size="sm"
            variant="outline"
            disabled={busy || e.status === 'cancel_requested'}
            onClick={() => void action(() => runtimeApi.cancel(e.id))}
          >
            {t('local_runtime.cancel')}
          </Button>
        )}
        {e.exit_code !== null && (
          <span>
            {t('local_runtime.exit_code')}: {e.exit_code}
          </span>
        )}
      </div>
      {e.approvals?.map((approval, index) => (
        <p key={index}>
          {t(
            `local_runtime.${approval.decision === 'approve' ? 'approved' : 'reject'}`
          )}{' '}
          · {new Date(approval.at).toLocaleString()}
        </p>
      ))}
      {open && (
        <div className="max-h-72 overflow-auto rounded bg-muted p-2">
          <pre className="whitespace-pre-wrap break-all">
            {events
              .filter(v => v.kind !== 'artifact')
              .map(v => v.data)
              .join('')}
          </pre>
          {events
            .filter(v => v.kind === 'artifact')
            .map(v => {
              try {
                const artifact = JSON.parse(v.data);
                const url = new URL(artifact.url);
                if (!['https:', 'http:'].includes(url.protocol)) return null;
                return (
                  <a
                    key={v.sequence}
                    className="block underline"
                    href={url.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {String(artifact.name)}
                  </a>
                );
              } catch {
                return null;
              }
            })}
        </div>
      )}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
    </article>
  );
}
