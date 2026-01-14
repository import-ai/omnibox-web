import type { Country, E164Number } from 'libphonenumber-js';
import { getCountryCallingCode, parsePhoneNumber } from 'libphonenumber-js';
import { ChevronDown } from 'lucide-react';
import { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';

import { ALLOWED_PHONE_COUNTRIES } from '@/const';
import { cn } from '@/lib/utils';

import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';

interface CountryData {
  code: Country;
  name: string;
  dialCode: string;
  flag: string;
}

const countries: CountryData[] = [
  { code: 'CN', name: 'China', dialCode: '+86', flag: '\u{1F1E8}\u{1F1F3}' },
  {
    code: 'US',
    name: 'United States',
    dialCode: '+1',
    flag: '\u{1F1FA}\u{1F1F8}',
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    dialCode: '+44',
    flag: '\u{1F1EC}\u{1F1E7}',
  },
  { code: 'JP', name: 'Japan', dialCode: '+81', flag: '\u{1F1EF}\u{1F1F5}' },
  {
    code: 'KR',
    name: 'South Korea',
    dialCode: '+82',
    flag: '\u{1F1F0}\u{1F1F7}',
  },
  {
    code: 'HK',
    name: 'Hong Kong',
    dialCode: '+852',
    flag: '\u{1F1ED}\u{1F1F0}',
  },
  { code: 'MO', name: 'Macau', dialCode: '+853', flag: '\u{1F1F2}\u{1F1F4}' },
  { code: 'TW', name: 'Taiwan', dialCode: '+886', flag: '\u{1F1F9}\u{1F1FC}' },
  {
    code: 'SG',
    name: 'Singapore',
    dialCode: '+65',
    flag: '\u{1F1F8}\u{1F1EC}',
  },
  { code: 'MY', name: 'Malaysia', dialCode: '+60', flag: '\u{1F1F2}\u{1F1FE}' },
  {
    code: 'AU',
    name: 'Australia',
    dialCode: '+61',
    flag: '\u{1F1E6}\u{1F1FA}',
  },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '\u{1F1E8}\u{1F1E6}' },
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '\u{1F1E9}\u{1F1EA}' },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '\u{1F1EB}\u{1F1F7}' },
  { code: 'IT', name: 'Italy', dialCode: '+39', flag: '\u{1F1EE}\u{1F1F9}' },
  { code: 'ES', name: 'Spain', dialCode: '+34', flag: '\u{1F1EA}\u{1F1F8}' },
  {
    code: 'NL',
    name: 'Netherlands',
    dialCode: '+31',
    flag: '\u{1F1F3}\u{1F1F1}',
  },
  { code: 'RU', name: 'Russia', dialCode: '+7', flag: '\u{1F1F7}\u{1F1FA}' },
  { code: 'IN', name: 'India', dialCode: '+91', flag: '\u{1F1EE}\u{1F1F3}' },
  { code: 'BR', name: 'Brazil', dialCode: '+55', flag: '\u{1F1E7}\u{1F1F7}' },
  { code: 'MX', name: 'Mexico', dialCode: '+52', flag: '\u{1F1F2}\u{1F1FD}' },
  { code: 'TH', name: 'Thailand', dialCode: '+66', flag: '\u{1F1F9}\u{1F1ED}' },
  { code: 'VN', name: 'Vietnam', dialCode: '+84', flag: '\u{1F1FB}\u{1F1F3}' },
  {
    code: 'PH',
    name: 'Philippines',
    dialCode: '+63',
    flag: '\u{1F1F5}\u{1F1ED}',
  },
  {
    code: 'ID',
    name: 'Indonesia',
    dialCode: '+62',
    flag: '\u{1F1EE}\u{1F1E9}',
  },
  {
    code: 'NZ',
    name: 'New Zealand',
    dialCode: '+64',
    flag: '\u{1F1F3}\u{1F1FF}',
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    dialCode: '+971',
    flag: '\u{1F1E6}\u{1F1EA}',
  },
  {
    code: 'SA',
    name: 'Saudi Arabia',
    dialCode: '+966',
    flag: '\u{1F1F8}\u{1F1E6}',
  },
  {
    code: 'ZA',
    name: 'South Africa',
    dialCode: '+27',
    flag: '\u{1F1FF}\u{1F1E6}',
  },
  {
    code: 'CH',
    name: 'Switzerland',
    dialCode: '+41',
    flag: '\u{1F1E8}\u{1F1ED}',
  },
  { code: 'SE', name: 'Sweden', dialCode: '+46', flag: '\u{1F1F8}\u{1F1EA}' },
  { code: 'NO', name: 'Norway', dialCode: '+47', flag: '\u{1F1F3}\u{1F1F4}' },
  { code: 'DK', name: 'Denmark', dialCode: '+45', flag: '\u{1F1E9}\u{1F1F0}' },
  { code: 'FI', name: 'Finland', dialCode: '+358', flag: '\u{1F1EB}\u{1F1EE}' },
  { code: 'PL', name: 'Poland', dialCode: '+48', flag: '\u{1F1F5}\u{1F1F1}' },
  { code: 'AT', name: 'Austria', dialCode: '+43', flag: '\u{1F1E6}\u{1F1F9}' },
  { code: 'BE', name: 'Belgium', dialCode: '+32', flag: '\u{1F1E7}\u{1F1EA}' },
  {
    code: 'PT',
    name: 'Portugal',
    dialCode: '+351',
    flag: '\u{1F1F5}\u{1F1F9}',
  },
  { code: 'IE', name: 'Ireland', dialCode: '+353', flag: '\u{1F1EE}\u{1F1EA}' },
  { code: 'GR', name: 'Greece', dialCode: '+30', flag: '\u{1F1EC}\u{1F1F7}' },
  { code: 'TR', name: 'Turkey', dialCode: '+90', flag: '\u{1F1F9}\u{1F1F7}' },
  { code: 'IL', name: 'Israel', dialCode: '+972', flag: '\u{1F1EE}\u{1F1F1}' },
  { code: 'EG', name: 'Egypt', dialCode: '+20', flag: '\u{1F1EA}\u{1F1EC}' },
  {
    code: 'AR',
    name: 'Argentina',
    dialCode: '+54',
    flag: '\u{1F1E6}\u{1F1F7}',
  },
  { code: 'CL', name: 'Chile', dialCode: '+56', flag: '\u{1F1E8}\u{1F1F1}' },
  { code: 'CO', name: 'Colombia', dialCode: '+57', flag: '\u{1F1E8}\u{1F1F4}' },
  { code: 'PE', name: 'Peru', dialCode: '+51', flag: '\u{1F1F5}\u{1F1EA}' },
];

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
  defaultCountry?: Country;
  className?: string;
  /**
   * Optional list of allowed country codes (ISO 3166-1 alpha-2).
   * If provided, overrides the default ALLOWED_PHONE_COUNTRIES constant.
   * Example: ['CN', 'US', 'GB']
   */
  allowedCountries?: readonly string[];
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
      allowedCountries: allowedCountriesProp,
    },
    ref
  ) => {
    // Use prop if provided, otherwise use default constant
    const allowedCountries = useMemo(
      () =>
        allowedCountriesProp
          ? filterCountries(allowedCountriesProp)
          : defaultAllowedCountries,
      [allowedCountriesProp]
    );

    const [selectedCountry, setSelectedCountry] =
      useState<Country>(defaultCountry);
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
          const phoneNumber = parsePhoneNumber(value);
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
      (country: Country) => {
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
          'flex h-9 w-full items-center rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:ring-ring/50 focus-within:ring-[3px] focus-within:border-ring',
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
          ref={ref}
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
);

PhoneNumberInput.displayName = 'PhoneNumberInput';

export { PhoneNumberInput };
export type { PhoneNumberInputProps };
