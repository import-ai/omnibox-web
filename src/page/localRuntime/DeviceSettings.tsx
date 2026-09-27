import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { http } from '@/lib/request';

import ExecutionList from './ExecutionList';
import { LocalDevice, runtimeApi } from './runtime';

function Device({
  device,
  refresh,
}: {
  device: LocalDevice;
  refresh: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(device.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      refresh();
      setError('');
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-2 rounded border p-3">
      <form
        className="flex flex-wrap gap-2"
        onSubmit={e => {
          e.preventDefault();
          void act(() => http.patch(`/local-devices/${device.id}`, { name }));
        }}
      >
        <input
          aria-label={t('local_runtime.device_name')}
          className="min-w-0 rounded border bg-background p-2"
          required
          maxLength={120}
          value={name}
          onChange={e => setName(e.target.value)}
          disabled={!!device.revoked_at}
        />
        <Button
          disabled={busy || !!device.revoked_at || !name.trim()}
          type="submit"
          variant="outline"
        >
          {t('local_runtime.rename')}
        </Button>
      </form>
      <p>
        {device.platform} ·{' '}
        {device.revoked_at
          ? t('local_runtime.revoked')
          : device.paused
            ? t('local_runtime.paused')
            : device.online
              ? t('local_runtime.online')
              : t('local_runtime.offline')}{' '}
        · {t(`local_runtime.policy.${device.command_policy}`)}
      </p>
      <p className="break-all text-muted-foreground">{device.shell}</p>
      {!device.revoked_at && (
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => {
            if (window.confirm(t('local_runtime.revoke_confirm')))
              void act(() => http.delete(`/local-devices/${device.id}`));
          }}
        >
          {t('local_runtime.revoke')}
        </Button>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
export default function DeviceSettings() {
  const { t } = useTranslation();
  const [devices, setDevices] = useState<LocalDevice[]>([]);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const result = await runtimeApi.devices();
        if (active) {
          setDevices(result);
          setError('');
        }
      } catch (e) {
        if (active) setError(String(e));
      } finally {
        if (active) timer = setTimeout(load, 5000);
      }
    };
    void load();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [revision]);
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold">{t('local_runtime.title')}</h2>
      <p>{t('local_runtime.description')}</p>
      {error && <p role="alert">{error}</p>}
      {!devices.length && <p>{t('local_runtime.no_devices')}</p>}
      {devices.map(d => (
        <Device key={d.id} device={d} refresh={() => setRevision(v => v + 1)} />
      ))}
      <ExecutionList />
    </div>
  );
}
