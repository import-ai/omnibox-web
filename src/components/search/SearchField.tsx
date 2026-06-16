import { type LucideIcon, Search } from 'lucide-react';
import {
  type ChangeEvent,
  type ComponentPropsWithoutRef,
  forwardRef,
  type ReactNode,
  type RefObject,
  useImperativeHandle,
  useRef,
} from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';

import {
  searchFieldClearButtonClassName,
  shouldShowSearchFieldClear,
} from './searchFieldUtils';
import { useSearchFieldValue } from './useSearchFieldValue';

export interface SearchFieldProps extends Omit<
  ComponentPropsWithoutRef<'input'>,
  'className' | 'onChange' | 'value' | 'defaultValue' | 'size'
> {
  value: string;
  onValueChange: (value: string) => void;
  debounceMs?: number;
  loading?: boolean;
  icon?: LucideIcon;
  showClear?: boolean;
  clearLabel?: string;
  onClear?: () => void;
  containerClassName?: string;
  inputClassName?: string;
  iconClassName?: string;
  clearClassName?: string;
  rightContent?: ReactNode;
}

interface SearchFieldIconProps {
  icon: LucideIcon;
  iconClassName?: string;
  loading: boolean;
}

function SearchFieldIcon({
  icon: Icon,
  iconClassName,
  loading,
}: SearchFieldIconProps) {
  return (
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
  );
}

interface SearchFieldActionsProps {
  canClear: boolean;
  clearClassName?: string;
  clearLabel?: string;
  onClear: () => void;
  rightContent?: ReactNode;
}

function SearchFieldActions({
  canClear,
  clearClassName,
  clearLabel,
  onClear,
  rightContent,
}: SearchFieldActionsProps) {
  if (!canClear && !rightContent) {
    return null;
  }

  return (
    <div className="absolute right-2 flex items-center gap-2">
      {canClear && (
        <Button
          type="button"
          variant="ghost"
          className={cn(searchFieldClearButtonClassName, clearClassName)}
          onClick={onClear}
        >
          {clearLabel}
        </Button>
      )}
      {rightContent}
    </div>
  );
}

interface SearchFieldViewProps {
  canRenderClear: boolean;
  clearClassName?: string;
  clearLabel?: string;
  containerClassName?: string;
  disabled?: boolean;
  draftValue: string;
  icon: LucideIcon;
  iconClassName?: string;
  inputClassName?: string;
  inputProps: Omit<SearchFieldProps, keyof SearchFieldOwnProps>;
  inputRef: RefObject<HTMLInputElement | null>;
  loading: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  rightContent?: ReactNode;
}

interface SearchFieldOwnProps {
  value: string;
  onValueChange: (value: string) => void;
  debounceMs?: number;
  loading?: boolean;
  icon?: LucideIcon;
  showClear?: boolean;
  clearLabel?: string;
  onClear?: () => void;
  containerClassName?: string;
  inputClassName?: string;
  iconClassName?: string;
  clearClassName?: string;
  rightContent?: ReactNode;
}

function SearchFieldView({
  canRenderClear,
  clearClassName,
  clearLabel,
  containerClassName,
  disabled,
  draftValue,
  icon,
  iconClassName,
  inputClassName,
  inputProps,
  inputRef,
  loading,
  onChange,
  onClear,
  rightContent,
}: SearchFieldViewProps) {
  return (
    <div
      className={cn(
        'relative flex min-h-9 w-full items-center rounded-md border border-line bg-transparent text-sm shadow-none transition-colors focus-within:outline-none focus-within:ring-0 dark:bg-transparent',
        disabled && 'cursor-not-allowed opacity-50',
        containerClassName
      )}
    >
      <SearchFieldIcon
        icon={icon}
        iconClassName={iconClassName}
        loading={loading}
      />
      <Input
        ref={inputRef}
        value={draftValue}
        onChange={onChange}
        disabled={disabled}
        className={cn(
          'h-9 border-0 bg-transparent pl-8 pr-3 text-sm shadow-none focus-visible:ring-0',
          (canRenderClear || rightContent) && 'pr-20',
          inputClassName
        )}
        {...inputProps}
      />
      <SearchFieldActions
        canClear={canRenderClear}
        clearClassName={clearClassName}
        clearLabel={clearLabel}
        onClear={onClear}
        rightContent={rightContent}
      />
    </div>
  );
}

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  function SearchField(props, ref) {
    const {
      value,
      onValueChange,
      debounceMs = 0,
      loading = false,
      icon: Icon = Search,
      showClear = false,
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
    const canClear = shouldShowSearchFieldClear(draftValue, showClear);
    const canRenderClear = canClear && !!clearLabel;

    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      updateDraftValue(event.target.value);
    };

    const handleClear = () => {
      clearValue();
      onClear?.();
      inputRef.current?.focus();
    };

    return (
      <SearchFieldView
        canRenderClear={canRenderClear}
        clearClassName={clearClassName}
        clearLabel={clearLabel}
        containerClassName={containerClassName}
        disabled={disabled}
        draftValue={draftValue}
        icon={Icon}
        iconClassName={iconClassName}
        inputClassName={inputClassName}
        inputProps={inputProps}
        inputRef={inputRef}
        loading={loading}
        onChange={handleChange}
        onClear={handleClear}
        rightContent={rightContent}
      />
    );
  }
);

SearchField.displayName = 'SearchField';
