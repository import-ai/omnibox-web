import React, { type ComponentProps, type KeyboardEvent } from 'react';

import {
  AutosizeTextarea,
  type AutosizeTextAreaRef,
} from '@/components/autosize-textarea';
import { cn } from '@/lib/utils';

type ResourceTitleTextareaProps = ComponentProps<typeof AutosizeTextarea> & {
  onEnter?: () => void;
};

export type { AutosizeTextAreaRef };

export function normalizeTitleInput(title: string) {
  return title.replace(/\r?\n/g, ' ');
}

export const ResourceTitleTextarea = React.forwardRef<
  AutosizeTextAreaRef,
  ResourceTitleTextareaProps
>(function ResourceTitleTextarea(
  { className, onKeyDown, onEnter, rows = 1, ...props },
  ref
) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      onEnter?.();
    }

    onKeyDown?.(event);
  };

  return (
    <AutosizeTextarea
      ref={ref}
      {...props}
      rows={rows}
      onKeyDown={handleKeyDown}
      className={cn(
        'mb-4 min-w-0 w-full resize-none overflow-hidden whitespace-pre-wrap break-words rounded-none border-0 bg-transparent px-0 py-0 text-[34px] font-bold leading-tight text-foreground shadow-none outline-none placeholder:text-muted-foreground/45 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-transparent',
        className
      )}
    />
  );
});
