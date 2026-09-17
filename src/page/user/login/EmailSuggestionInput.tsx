import { Mail } from 'lucide-react';
import {
  type ChangeEvent,
  type FocusEvent,
  forwardRef,
  type KeyboardEvent,
  useEffect,
  useId,
  useState,
} from 'react';

import { Input, type InputProps } from '@/components/input';
import { cn } from '@/lib/utils';

import { getEmailSuggestions } from './emailDomains';

interface EmailSuggestionInputProps extends Omit<
  InputProps,
  'onChange' | 'value'
> {
  onChange: (value: string) => void;
  value: string;
}

export const EmailSuggestionInput = forwardRef<
  HTMLInputElement,
  EmailSuggestionInputProps
>(function EmailSuggestionInput(
  { className, onChange, onFocus, onBlur, onKeyDown, value, ...props },
  ref
) {
  const listId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const suggestions = getEmailSuggestions(value);
  const showSuggestions = isOpen && suggestions.length > 0;

  useEffect(() => {
    setActiveIndex(0);
  }, [value]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
    setIsOpen(true);
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    setIsOpen(true);
    onFocus?.(event);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    setIsOpen(false);
    onBlur?.(event);
  };

  const selectEmail = (email: string) => {
    onChange(email);
    setIsOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) {
      onKeyDown?.(event);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex(index => (index + 1) % suggestions.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(
        index => (index - 1 + suggestions.length) % suggestions.length
      );
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      selectEmail(suggestions[activeIndex]);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
      return;
    }

    onKeyDown?.(event);
  };

  return (
    <div>
      <Input
        {...props}
        ref={ref}
        type="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        startIcon={Mail}
        value={value}
        role="combobox"
        aria-expanded={showSuggestions}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          showSuggestions ? `${listId}-${activeIndex}` : undefined
        }
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn('aria-[invalid=true]:border-destructive', className)}
      />
      {showSuggestions && (
        <ul
          id={listId}
          role="listbox"
          className="no-scrollbar mt-1 max-h-60 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {suggestions.map((email, index) => (
            <li
              key={email}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={cn(
                'cursor-pointer rounded-sm px-3 py-2 text-sm text-muted-foreground',
                index === activeIndex && 'bg-accent text-accent-foreground'
              )}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={event => event.preventDefault()}
              onClick={() => selectEmail(email)}
            >
              {email}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
