import { type LucideIcon, Search } from 'lucide-react';
import {
  type ChangeEvent,
  type ComponentPropsWithoutRef,
  forwardRef,
  type ReactNode,
  useImperativeHandle,
  useRef,
} from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';

import { useSearchFieldValue } from './useSearchFieldValue';

export const searchFieldClearButtonClassName =
  'h-[22px] rounded border-none bg-transparent px-2 text-sm font-normal text-muted-foreground shadow-none outline-none ring-0 hover:bg-accent hover:text-muted-foreground focus-visible:ring-0 focus-visible:ring-transparent active:!bg-[#3b82f633] active:text-[#3b82f6] dark:hover:bg-accent';

export interface SearchFieldProps extends Omit<
  ComponentPropsWithoutRef<'input'>,
  'className' | 'onChange' | 'value' | 'defaultValue' | 'size'
> {
  value: string;
  onValueChange: (value: string) => void;
  debounceMs?: number;
  loading?: boolean;
  icon?: LucideIcon;
  clearLabel?: string;
  onClear?: () => void;
  containerClassName?: string;
  inputClassName?: string;
  iconClassName?: string;
  clearClassName?: string;
  rightContent?: ReactNode;
}

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  function SearchField(props, ref) {
    const {
      value,
      onValueChange,
      debounceMs = 0,
      loading = false,
      icon: Icon = Search,
      clearLabel,
      onClear,
      containerClassName,
      inputClassName,
      iconClassName,
      clearClassName,
      rightContent,
      disabled,
      ...inputProps
    } = props;
    const inputRef = useRef<HTMLInputElement>(null);
    const { draftValue, updateDraftValue, clearValue } = useSearchFieldValue({
      value,
      onValueChange,
      debounceMs,
    });
    const canRenderClear = !!clearLabel && draftValue.length > 0;

    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const handleClear = () => {
      clearValue();
      onClear?.();
      inputRef.current?.focus();
    };

    return (
      <div
        className={cn(
          'relative flex min-h-9 w-full items-center rounded-md border border-line bg-transparent text-sm shadow-none transition-colors focus-within:outline-none focus-within:ring-0 dark:bg-transparent',
          disabled && 'cursor-not-allowed opacity-50',
          containerClassName
        )}
      >
        <span className="pointer-events-none absolute left-3 flex items-center text-muted-foreground">
          {loading ? (
            <Spinner className={cn('size-4 opacity-70', iconClassName)} />
          ) : (
            <Icon
              aria-hidden="true"
              className={cn('size-4 opacity-70', iconClassName)}
            />
          )}
        </span>
        <Input
          ref={inputRef}
          value={draftValue}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            updateDraftValue(event.target.value);
          }}
          disabled={disabled}
          className={cn(
            'h-9 border-0 bg-transparent pl-8 pr-3 text-sm shadow-none focus-visible:ring-0',
            (canRenderClear || rightContent) && 'pr-20',
            inputClassName
          )}
          {...inputProps}
        />
        {(canRenderClear || rightContent) && (
          <div className="absolute right-2 flex items-center gap-2">
            {canRenderClear && (
              <Button
                type="button"
                variant="ghost"
                aria-label={clearLabel}
                className={cn(searchFieldClearButtonClassName, clearClassName)}
                onClick={handleClear}
              >
                {clearLabel}
              </Button>
            )}
            {rightContent}
          </div>
        )}
      </div>
    );
  }
);
