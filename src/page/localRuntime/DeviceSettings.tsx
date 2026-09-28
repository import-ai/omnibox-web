import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/AlertDialog';
import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/Separator';
import { Spinner } from '@/components/ui/Spinner';
import { http } from '@/lib/request';
import { getRelatedTime } from '@/lib/time';

import DeviceIdentity from './DeviceIdentity';
import ExecutionList from './ExecutionList';
import RenameDevice from './RenameDevice';
import { LocalDevice, useCurrentDeviceId, useLocalDevices } from './runtime';

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-6 items-center rounded-lg border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  );
}

function DeviceCard({
  device,
  refresh,
  devices,
  isCurrent,
}: {
  device: LocalDevice;
  refresh: () => void;
  devices: LocalDevice[];
  isCurrent: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [removing, setRemoving] = useState(false);
  const remove = async () => {
    setRemoving(true);
    try {
      await http.delete(`/local-devices/${device.id}`);
      refresh();
    } finally {
      setRemoving(false);
    }
  };
  const platform = t(`local_runtime.platform.${device.platform}`, {
    defaultValue: device.platform,
  });
  const state = !device.online
    ? 'offline'
    : device.paused
      ? 'paused'
      : 'online';
  return (
    <div className="flex flex-col gap-4 rounded-md border border-border p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="group flex min-w-0 items-center gap-1">
          <span className="truncate text-sm font-semibold text-foreground">
            {device.name}
          </span>
          <RenameDevice device={device} devices={devices} refresh={refresh} />
          {isCurrent && <Chip>{t('local_runtime.this_device')}</Chip>}
        </div>
        <AlertDialog>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  aria-label={t('local_runtime.remove.label')}
                  className="group flex size-10 items-center justify-center transition-opacity hover:opacity-70 lg:size-auto lg:p-1"
                >
                  <Trash2 className="size-4 text-muted-foreground group-hover:text-destructive" />
                </button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">
              {t('local_runtime.remove.label')}
            </TooltipContent>
          </Tooltip>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t('local_runtime.remove.confirm.title')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('local_runtime.remove.confirm.description')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel asChild>
                <Button variant="outline">{t('cancel')}</Button>
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={removing}
                onClick={() => void remove()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {removing && <Spinner className="mr-2" />}
                {t('local_runtime.remove.confirm.button')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <div className="flex flex-wrap gap-1">
        <Chip>{platform}</Chip>
        <Chip>{t(`local_runtime.${state}`)}</Chip>
        <Chip>{t(`local_runtime.policy.${device.command_policy}`)}</Chip>
      </div>
      <DeviceIdentity device={device} />
      <div className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">
          {t('local_runtime.last_seen')}
        </span>
        {device.last_seen_at ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="w-fit text-sm font-semibold text-foreground">
                {getRelatedTime(new Date(device.last_seen_at), i18n)}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">
              {format(new Date(device.last_seen_at), 'yyyy-MM-dd HH:mm:ss')}
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-sm font-semibold text-foreground">
            {t('local_runtime.never_seen')}
          </span>
        )}
      </div>
    </div>
  );
}

export default function DeviceSettings() {
  const { t } = useTranslation();
  const { devices, error, refresh } = useLocalDevices();
  const currentDeviceId = useCurrentDeviceId();
  if (!devices && !error) {
    return (
      <div className="flex size-full items-center justify-center">
        <Spinner className="size-6 text-gray-400" />
      </div>
    );
  }
  // Revoked devices can never reconnect, so only active ones are listed.
  const active = (devices ?? [])
    .filter(device => !device.revoked_at)
    .sort(
      (a, b) =>
        Number(b.id === currentDeviceId) - Number(a.id === currentDeviceId)
    );
  return (
    <TooltipProvider>
      <div className="flex flex-col">
        <div className="flex flex-col gap-2.5">
          <h3 className="text-base font-semibold text-foreground">
            {t('local_runtime.title')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('local_runtime.description')}
          </p>
        </div>
        <Separator className="my-6" />
        {error && (
          <p role="alert" className="mb-4 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-4">
          {active.length === 0 ? (
            <div className="rounded-md border border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">
                {t('local_runtime.no_devices')}
              </p>
            </div>
          ) : (
            active.map(device => (
              <DeviceCard
                key={device.id}
                device={device}
                devices={active}
                isCurrent={device.id === currentDeviceId}
                refresh={refresh}
              />
            ))
          )}
        </div>
        <Separator className="my-6" />
        <ExecutionList devices={devices ?? []} />
      </div>
    </TooltipProvider>
  );
}
