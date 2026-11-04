import type React from 'react';

import { cn } from '@/lib/utils';

export function SettingsInfoRow({
  icon,
  label,
  value,
  description,
  button,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: string;
  description: string;
  button?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'grid w-full items-center gap-2 px-2 py-2',
        icon
          ? 'grid-cols-[24px_minmax(0,1fr)_auto]'
          : 'grid-cols-[minmax(0,1fr)_auto]'
      )}
    >
      {icon && (
        <span className="flex size-4 items-center justify-center text-muted-foreground [&>svg]:size-4">
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-sm font-medium leading-5 text-foreground">
            {label}
          </p>
          {value != null && (
            <p className="min-w-0 break-words text-sm font-normal leading-5 text-muted-foreground">
              {value}
            </p>
          )}
        </div>
        <p className="mt-1 whitespace-normal text-xs leading-4 text-muted-foreground">
          {description}
        </p>
      </div>
      {button}
    </div>
  );
}
