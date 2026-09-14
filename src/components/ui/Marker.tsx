import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export function Marker({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex min-h-4 w-full items-center gap-2 text-sm text-muted-foreground',
        className
      )}
      {...props}
    />
  );
}

export function MarkerIcon({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      aria-hidden="true"
      className={cn('size-4 shrink-0', className)}
      {...props}
    />
  );
}

export function MarkerContent({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('min-w-0', className)} {...props} />;
}
