import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';

import ExecutionCard from './ExecutionCard';
import { LocalDevice, LocalExecution, runtimeApi } from './runtime';

export default function ExecutionList() {
  const { t } = useTranslation();
  const [executions, setExecutions] = useState<LocalExecution[]>([]);
  const [devices, setDevices] = useState<LocalDevice[]>([]);
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(100);
  const [more, setMore] = useState(false);
  const refresh = useCallback(async () => {
    const [devices, rows] = await Promise.all([
      runtimeApi.devices(),
      Promise.all(
        Array.from({ length: Math.ceil(limit / 100) }, (_, i) =>
          runtimeApi.executions(undefined, i * 100)
        )
      ).then(p => p.flat()),
    ]);
    return { devices, rows };
  }, [limit]);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const { devices, rows } = await refresh();
        if (active) {
          setDevices(devices);
          setExecutions(rows);
          setMore(rows.length === limit);
          setError('');
        }
      } catch (err) {
        if (active) setError(String(err));
      } finally {
        if (active) timer = setTimeout(load, 2000);
      }
    };
    void load();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [refresh, revision, limit]);
  return (
    <section aria-label={t('local_runtime.executions')} className="space-y-3">
      <h3 className="font-semibold">{t('local_runtime.executions')}</h3>
      {error && <p role="alert">{error}</p>}
      {!executions.length && !error && (
        <p className="text-muted-foreground">{t('local_runtime.empty')}</p>
      )}
      {executions.map(e => (
        <ExecutionCard
          key={e.id}
          execution={e}
          deviceName={
            devices.find(d => d.id === e.device_id)?.name ?? e.device_id
          }
          refresh={() => setRevision(v => v + 1)}
        />
      ))}
      {more && (
        <Button variant="outline" onClick={() => setLimit(v => v + 100)}>
          {t('local_runtime.more')}
        </Button>
      )}
    </section>
  );
}
