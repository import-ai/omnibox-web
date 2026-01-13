import 'react-phone-number-input/style.css';

import type { Country, E164Number } from 'libphonenumber-js';
import { forwardRef } from 'react';
import PhoneInput from 'react-phone-number-input';

import { cn } from '@/lib/utils';

interface PhoneNumberInputProps {
  value?: E164Number | undefined;
  onChange: (value: E164Number | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
  defaultCountry?: Country;
  className?: string;
}

const PhoneNumberInput = forwardRef<HTMLInputElement, PhoneNumberInputProps>(
  (
    {
      value,
      onChange,
      disabled,
      placeholder,
      defaultCountry = 'CN',
      className,
    },
    ref
  ) => {
    return (
      <PhoneInput
        ref={ref}
        international
        countryCallingCodeEditable={false}
        defaultCountry={defaultCountry}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          'phone-input-wrapper flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] focus-within:ring-ring/50 focus-within:ring-[3px] focus-within:border-ring md:text-sm',
          'disabled:cursor-not-allowed disabled:opacity-50',
          '[&_.PhoneInputInput]:flex-1 [&_.PhoneInputInput]:border-none [&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:outline-none [&_.PhoneInputInput]:placeholder:text-muted-foreground',
          '[&_.PhoneInputCountry]:mr-2',
          '[&_.PhoneInputCountryIcon]:size-5',
          '[&_.PhoneInputCountrySelectArrow]:ml-1 [&_.PhoneInputCountrySelectArrow]:border-muted-foreground',
          className
        )}
      />
    );
  }
);

PhoneNumberInput.displayName = 'PhoneNumberInput';

export { PhoneNumberInput };
