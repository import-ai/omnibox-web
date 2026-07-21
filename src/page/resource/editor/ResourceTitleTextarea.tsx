import type { ComponentProps, KeyboardEvent } from 'react';

import { AutosizeTextarea } from '@/components/autosize-textarea';
import { cn } from '@/lib/utils';

type ResourceTitleTextareaProps = ComponentProps<typeof AutosizeTextarea>;

export function normalizeTitleInput(title: string) {
  return title.replace(/\r?\n/g, ' ');
}

export function ResourceTitleTextarea({
  className,
  onKeyDown,
  rows = 1,
  ...props
}: ResourceTitleTextareaProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
    }

    onKeyDown?.(event);
  };

  return (
    <AutosizeTextarea
      {...props}
      rows={rows}
      onKeyDown={handleKeyDown}
      className={cn(
        'mb-4 resize-none overflow-hidden whitespace-pre-wrap break-words rounded-none border-0 bg-transparent px-0 py-0 text-4xl font-bold leading-tight text-foreground shadow-none outline-none placeholder:text-muted-foreground/45 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-transparent',
        className
      )}
    />
  );
}
