import { useTranslation } from 'react-i18next';

import Copy from '@/components/copy';

import { LocalDevice } from './runtime';

export default function DeviceIdentity({
  device,
}: {
  device: Pick<LocalDevice, 'id' | 'hostname'>;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">
          {t('local_runtime.hostname')}
        </span>
        <span className="break-all text-sm text-foreground">
          {device.hostname || t('local_runtime.hostname_unknown')}
        </span>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">
          {t('local_runtime.device_id')}
        </summary>
        <div className="flex items-center gap-2">
          <code className="break-all text-xs">{device.id}</code>
          <Copy
            content={device.id}
            tooltip={t('local_runtime.copy_device_id')}
          />
        </div>
      </details>
    </div>
  );
}
