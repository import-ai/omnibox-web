import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/Popover';
import { http } from '@/lib/request';

import { LocalDevice } from './runtime';
const NAME_MAX_LENGTH = 120;

export default function RenameDevice({
  device,
  refresh,
  devices = [],
  disabled = false,
}: {
  device: LocalDevice;
  refresh: () => void;
  devices?: LocalDevice[];
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(device.name);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    const value = name.trim();
    if (saving || disabled || !device.online) return;
    if (!value || value === device.name) return setOpen(false);
    setSaving(true);
    try {
      await http.patch(`/local-devices/${device.id}`, { name: value });
      refresh();
      setOpen(false);
    } catch {
      // The HTTP client displays the API error and keeps the editor open.
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
              disabled={disabled || !device.online}
              title={
                !device.online ? t('local_runtime.rename_offline') : undefined
              }
              aria-label={t('local_runtime.rename')}
              className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground md:opacity-0 md:group-hover:opacity-100 md:data-[state=open]:opacity-100"
            >
              <Pencil className="size-3.5" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">
          {t(
            device.online
              ? 'local_runtime.rename'
              : 'local_runtime.rename_offline'
          )}
        </TooltipContent>
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
            disabled={saving}
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
        {devices.some(
          other =>
            other.id !== device.id &&
            !other.revoked_at &&
            other.name === name.trim()
        ) && (
          <p role="status" className="text-xs text-muted-foreground">
            {t('local_runtime.duplicate_name')}
          </p>
        )}
        <div className="flex justify-end">
          <Button
            className="h-8"
            disabled={saving || disabled || !device.online || !name.trim()}
            onClick={() => void save()}
          >
            {t('local_runtime.save')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
