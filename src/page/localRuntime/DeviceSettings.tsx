import { format } from 'date-fns';
import { Pencil, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
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
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/Popover';
import { Separator } from '@/components/ui/Separator';
import { Spinner } from '@/components/ui/Spinner';
import { http } from '@/lib/request';
import { getRelatedTime } from '@/lib/time';

import ExecutionList from './ExecutionList';
import { LocalDevice, runtimeApi } from './runtime';

const NAME_MAX_LENGTH = 120;

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-6 items-center rounded-lg border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  );
}

function RenameDevice({
  device,
  refresh,
}: {
  device: LocalDevice;
  refresh: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(device.name);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    const value = name.trim();
    if (!value || value === device.name) return setOpen(false);
    setSaving(true);
    try {
      await http.patch(`/local-devices/${device.id}`, { name: value });
      refresh();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Popover
      open={open}
      onOpenChange={next => {
        setOpen(next);
        if (next) setName(device.name);
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={t('local_runtime.rename')}
              className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground md:opacity-0 md:group-hover:opacity-100 md:data-[state=open]:opacity-100"
            >
              <Pencil className="size-3.5" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">{t('local_runtime.rename')}</TooltipContent>
      </Tooltip>
      <PopoverContent align="start" className="w-72 space-y-3 p-3">
        <div className="space-y-1.5">
          <Label htmlFor={`device-name-${device.id}`}>
            {t('local_runtime.device_name')}
          </Label>
          <Input
            id={`device-name-${device.id}`}
            value={name}
            maxLength={NAME_MAX_LENGTH}
            onChange={event => setName(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void save();
              }
            }}
          />
          <div className="flex justify-end text-xs text-muted-foreground">
            {name.length}/{NAME_MAX_LENGTH}
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            className="h-8"
            disabled={saving || !name.trim()}
            onClick={() => void save()}
          >
            {t('local_runtime.save')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DeviceCard({
  device,
  refresh,
}: {
  device: LocalDevice;
  refresh: () => void;
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
  const state = device.paused ? 'paused' : device.online ? 'online' : 'offline';
  return (
    <div className="flex flex-col gap-4 rounded-md border border-border p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="group flex min-w-0 items-center gap-1">
          <span className="truncate text-sm font-semibold text-foreground">
            {device.name}
          </span>
          <RenameDevice device={device} refresh={refresh} />
        </div>
        <AlertDialog>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  aria-label={t('local_runtime.remove')}
                  className="group flex size-10 items-center justify-center transition-opacity hover:opacity-70 lg:size-auto lg:p-1"
                >
                  <Trash2 className="size-4 text-muted-foreground group-hover:text-destructive" />
                </button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">
              {t('local_runtime.remove')}
            </TooltipContent>
          </Tooltip>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t('local_runtime.remove_confirm.title')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('local_runtime.remove_confirm.description')}
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
                {t('local_runtime.remove_confirm.button')}
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
  const [devices, setDevices] = useState<LocalDevice[]>();
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(v => v + 1), []);
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
  }, [revision]);
  if (!devices && !error) {
    return (
      <div className="flex size-full items-center justify-center">
        <Spinner className="size-6 text-gray-400" />
      </div>
    );
  }
  // Revoked devices can never reconnect, so only active ones are listed.
  const active = (devices ?? []).filter(device => !device.revoked_at);
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
              <DeviceCard key={device.id} device={device} refresh={refresh} />
            ))
          )}
        </div>
        <Separator className="my-6" />
        <ExecutionList devices={devices ?? []} />
      </div>
    </TooltipProvider>
  );
}
