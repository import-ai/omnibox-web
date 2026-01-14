import {
  type CountryCode,
  type E164Number,
  getCountryCallingCode,
  parsePhoneNumberFromString,
} from 'libphonenumber-js';
import { ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ALLOWED_PHONE_COUNTRIES } from '@/const';
import { cn } from '@/lib/utils';

import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { countries, type CountryData } from './consts';

/**
 * Filter countries based on a list of allowed country codes.
 */
function filterCountries(allowedCodes: readonly string[]): CountryData[] {
  return countries.filter(c => allowedCodes.includes(c.code));
}

// Default filtered countries based on constant
const defaultAllowedCountries = filterCountries(ALLOWED_PHONE_COUNTRIES);

interface PhoneNumberInputProps {
  value?: E164Number | undefined;
  onChange: (value: E164Number | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
  defaultCountry?: CountryCode;
  className?: string;
  /**
   * Optional list of allowed country codes (ISO 3166-1 alpha-2).
   * If provided, overrides the default ALLOWED_PHONE_COUNTRIES constant.
   * Example: ['CN', 'US', 'GB']
   */
  allowedCountries?: readonly string[];
}

function PhoneNumberInput({
  value,
  onChange,
  disabled,
  placeholder,
  defaultCountry = 'CN',
  className,
  allowedCountries: allowedCountriesProp,
}: PhoneNumberInputProps) {
  // Use prop if provided, otherwise use default constant
  const allowedCountries = useMemo(
    () =>
      allowedCountriesProp
        ? filterCountries(allowedCountriesProp)
        : defaultAllowedCountries,
    [allowedCountriesProp]
  );

  const [selectedCountry, setSelectedCountry] =
    useState<CountryCode>(defaultCountry);
  const [nationalNumber, setNationalNumber] = useState('');

  const selectedCountryData = useMemo(
    () =>
      allowedCountries.find(c => c.code === selectedCountry) ||
      allowedCountries[0],
    [selectedCountry, allowedCountries]
  );

  // Parse initial value to extract country and national number
  useEffect(() => {
    if (value) {
      try {
        const phoneNumber = parsePhoneNumberFromString(value);
        if (phoneNumber) {
          const country = phoneNumber.country;
          if (country && allowedCountries.some(c => c.code === country)) {
            setSelectedCountry(country);
          }
          setNationalNumber(phoneNumber.nationalNumber);
        }
      } catch {
        // Invalid phone number, ignore
      }
    }
  }, []);

  const handleCountryChange = useCallback(
    (country: CountryCode) => {
      setSelectedCountry(country);

      // Update the full phone number with new country code
      if (nationalNumber) {
        try {
          const callingCode = getCountryCallingCode(country);
          const fullNumber = `+${callingCode}${nationalNumber.replace(/\D/g, '')}`;
          onChange(fullNumber as E164Number);
        } catch {
          // Invalid, just update country
        }
      }
    },
    [nationalNumber, onChange]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      // Only keep digits
      const digitsOnly = inputValue.replace(/\D/g, '');

      // Update display value (just the digits, no formatting to avoid issues)
      setNationalNumber(digitsOnly);

      // Build full E164 number
      if (digitsOnly) {
        const callingCode = getCountryCallingCode(selectedCountry);
        const fullNumber = `+${callingCode}${digitsOnly}`;
        onChange(fullNumber as E164Number);
      } else {
        onChange(undefined);
      }
    },
    [selectedCountry, onChange]
  );

  const isSingleCountry = allowedCountries.length === 1;

  return (
    <div
      className={cn(
        'flex h-10 w-full items-center rounded-md border border-input bg-background dark:bg-[#303030] shadow-xs transition-[color,box-shadow] focus-within:outline-none focus-within:ring-1 focus-within:ring-ring',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      {isSingleCountry ? (
        <div className="flex h-full shrink-0 items-center gap-1 border-r border-input px-2 text-sm">
          <span className="text-base">{selectedCountryData.flag}</span>
          <span className="text-muted-foreground">
            {selectedCountryData.dialCode}
          </span>
        </div>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={disabled}>
            <Button
              type="button"
              variant="ghost"
              className="h-full shrink-0 gap-1 rounded-l-md rounded-r-none border-r border-input px-2 text-sm hover:bg-accent focus-visible:ring-0"
            >
              <span className="text-base">{selectedCountryData.flag}</span>
              <span className="text-muted-foreground">
                {selectedCountryData.dialCode}
              </span>
              <ChevronDown className="size-3.5 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="p-0">
            <ScrollArea className="h-[300px]">
              {allowedCountries.map(country => (
                <DropdownMenuItem
                  key={country.code}
                  onClick={() => handleCountryChange(country.code)}
                  className="cursor-pointer gap-2"
                >
                  <span className="text-base">{country.flag}</span>
                  <span>{country.name}</span>
                  <span className="text-muted-foreground">
                    {country.dialCode}
                  </span>
                </DropdownMenuItem>
              ))}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <Input
        type="tel"
        value={nationalNumber}
        onChange={handleInputChange}
        disabled={disabled}
        placeholder={placeholder}
        className="h-full flex-1 border-0 shadow-none focus-visible:ring-0"
      />
    </div>
  );
}

export { PhoneNumberInput };
export type { PhoneNumberInputProps };
