import { Mail } from 'lucide-react';
import {
  type ChangeEvent,
  type FocusEvent,
  forwardRef,
  type KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

import { Input, type InputProps } from '@/components/input';
import { ScrollArea } from '@/components/ui/ScrollArea';
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
  const activeOptionRef = useRef<HTMLLIElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const suggestions = getEmailSuggestions(value);
  const showSuggestions = isOpen && suggestions.length > 0;

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

  useEffect(() => {
    setActiveIndex(0);
  }, [value]);

  useEffect(() => {
    if (showSuggestions) {
      activeOptionRef.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, showSuggestions, value]);

  return (
    <div className="relative">
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
        <ScrollArea
          type="scroll"
          className="absolute inset-x-0 top-full z-50 mt-1 rounded-md border bg-popover text-popover-foreground shadow-md [&>[data-radix-scroll-area-viewport]]:max-h-60"
          onMouseDown={event => event.preventDefault()}
        >
          <ul id={listId} role="listbox" className="p-1">
            {suggestions.map((email, index) => (
              <li
                key={email}
                ref={index === activeIndex ? activeOptionRef : undefined}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                className={cn(
                  'cursor-pointer rounded-sm px-3 py-2 text-sm text-muted-foreground',
                  index === activeIndex && 'bg-accent text-accent-foreground'
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectEmail(email)}
              >
                {email}
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}
    </div>
  );
});
