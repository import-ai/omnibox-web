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

import { Button } from '../ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/DropdownMenu';
import { Input } from '../ui/Input';
import { ScrollArea } from '../ui/ScrollArea';
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
  variant?: 'default' | 'bind';
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
  variant = 'default',
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
    if (!value) {
      setNationalNumber('');
      return;
    }
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
  }, [value, allowedCountries]);

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
        onChange('' as E164Number);
      }
    },
    [selectedCountry, onChange]
  );

  const isSingleCountry = allowedCountries.length === 1;
  const isBind = variant === 'bind';

  const countryPrefix = (
    <>
      <span className={isBind ? 'text-[15px] leading-[18px]' : 'text-base'}>
        {selectedCountryData.flag}
      </span>
      <span
        className={
          isBind
            ? 'text-[15px] leading-[18px] text-foreground'
            : 'text-muted-foreground'
        }
      >
        {selectedCountryData.dialCode}
      </span>
    </>
  );

  return (
    <div
      className={cn(
        'flex h-10 w-full items-center rounded-md border border-line bg-transparent transition-[color,box-shadow] focus-within:outline-none focus-within:ring-1 focus-within:ring-ring',
        disabled && 'cursor-not-allowed opacity-50',
        isBind && 'overflow-hidden rounded-lg',
        className
      )}
    >
      {isSingleCountry ? (
        <div
          className={cn(
            'flex shrink-0 items-center',
            isBind
              ? 'h-8 w-[85px] gap-1 px-[15px] text-[15px]'
              : 'h-full gap-1 border-r px-2 text-sm'
          )}
        >
          {countryPrefix}
        </div>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={disabled}>
            <Button
              type="button"
              variant="ghost"
              className={cn(
                'shrink-0 gap-1 rounded-l-md rounded-r-none text-sm hover:bg-accent focus-visible:ring-0',
                isBind
                  ? 'h-8 w-[85px] px-[15px]'
                  : 'h-full border-r border-line px-2'
              )}
            >
              {countryPrefix}
              {isBind ? null : <ChevronDown className="size-3.5 opacity-50" />}
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
      {isBind ? (
        <div className="h-8 w-px shrink-0 bg-[#E5E5E5] dark:bg-[#303030]" />
      ) : null}
      <Input
        type="tel"
        value={nationalNumber}
        onChange={handleInputChange}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          'h-full flex-1 border-0 shadow-none focus-visible:ring-0',
          isBind &&
            'pl-[18px] text-[14px] leading-[23px] placeholder:text-[14px] placeholder:text-muted-foreground md:text-[14px]'
        )}
      />
    </div>
  );
}

export { PhoneNumberInput };
export type { PhoneNumberInputProps };
