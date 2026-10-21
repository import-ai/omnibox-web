import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { sidebarToolbarIconButtonClassName } from '@/components/omnibox/IconButton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/Label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/Popover';
import { http } from '@/lib/request';
import { cn } from '@/lib/utils';

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
  const unavailable = disabled || !device.online;
  const save = async () => {
    const value = name.trim();
    if (saving || unavailable) return;
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
  const renameButton = (
    <PopoverTrigger asChild>
      <button
        type="button"
        disabled={unavailable}
        aria-label={t('local_runtime.rename')}
        className={cn(
          sidebarToolbarIconButtonClassName,
          'inline-flex size-6 shrink-0 items-center justify-center rounded-md md:opacity-0',
          unavailable
            ? 'pointer-events-none opacity-50 md:group-hover:opacity-50'
            : 'hover:text-foreground md:group-hover:opacity-100 md:data-[state=open]:opacity-100'
        )}
      >
        <Pencil className="size-3.5" />
      </button>
    </PopoverTrigger>
  );
  return (
    <Popover
      open={open}
      onOpenChange={next => {
        if (next && unavailable) return;
        setOpen(next);
        if (next) setName(device.name);
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          {unavailable ? (
            <span className="inline-flex cursor-not-allowed">
              {renameButton}
            </span>
          ) : (
            renameButton
          )}
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
              if (
                event.key === 'Enter' &&
                !event.nativeEvent.isComposing &&
                event.keyCode !== 229
              ) {
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
            disabled={saving || unavailable || !name.trim()}
            onClick={() => void save()}
          >
            {t('local_runtime.save')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
