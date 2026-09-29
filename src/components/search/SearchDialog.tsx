import { X } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/Button';
import { searchFieldClearButtonClassName } from '@/components/search/SearchField';
import { Command, CommandDialog, CommandInput } from '@/components/ui/Command';
import { cn } from '@/lib/utils';

interface SearchDialogProps {
  children: ReactNode;
  clearLabel: string;
  closeLabel: string;
  onClear?: () => void;
  onOpenChange: (open: boolean) => void;
  onValueChange: (value: string) => void;
  open: boolean;
  placeholder: string;
  value: string;
  className?: string;
  contentClassName?: string;
}

export function SearchDialog({
  children,
  clearLabel,
  closeLabel,
  onClear,
  onOpenChange,
  onValueChange,
  open,
  placeholder,
  value,
  className,
  contentClassName,
}: SearchDialogProps) {
  const handleClear = () => {
    onValueChange('');
    onClear?.();
  };

  return (
    <CommandDialog
      title={placeholder}
      description={placeholder}
      open={open}
      onOpenChange={onOpenChange}
      className={cn(
        'top-1/2 -translate-y-1/2 w-[calc(100vw-32px)] sm:max-w-[1040px] rounded-2xl border-none bg-popover shadow-xl',
        contentClassName
      )}
    >
      <Command
        shouldFilter={false}
        className={cn(
          'h-[min(640px,calc(100vh-32px))] rounded-2xl bg-popover px-5 py-4 text-foreground',
          className
        )}
      >
        <div className="relative flex h-full flex-col gap-2">
          <div className="flex shrink-0 items-center gap-3 border-b border-border pb-3">
            <div className="min-w-0 flex-1">
              <CommandInput
                placeholder={placeholder}
                value={value}
                onValueChange={onValueChange}
                className="h-8 py-0 text-base md:text-sm"
              />
            </div>
            <div className="flex shrink-0 items-center justify-end gap-3">
              <div
                className={cn('flex items-center gap-3', !value && 'invisible')}
              >
                <Button
                  type="button"
                  variant="ghost"
                  className={searchFieldClearButtonClassName}
                  onClick={handleClear}
                >
                  {clearLabel}
                </Button>
                <span
                  aria-hidden="true"
                  className="h-4 w-px bg-slate-200 dark:bg-neutral-700"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={closeLabel}
                className="size-4 rounded-none p-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
                onClick={() => onOpenChange(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          {children}
        </div>
      </Command>
    </CommandDialog>
  );
}
