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
import { ScrollArea } from './ui/scroll-area';

interface CountryData {
  code: Country;
  name: string;
  dialCode: string;
  flag: string;
}

const countries: CountryData[] = [
  { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳' },
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
  { code: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', dialCode: '+82', flag: '🇰🇷' },
  { code: 'HK', name: 'Hong Kong', dialCode: '+852', flag: '🇭🇰' },
  { code: 'TW', name: 'Taiwan', dialCode: '+886', flag: '🇹🇼' },
  { code: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬' },
  { code: 'MY', name: 'Malaysia', dialCode: '+60', flag: '🇲🇾' },
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦' },
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪' },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸' },
  { code: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱' },
  { code: 'RU', name: 'Russia', dialCode: '+7', flag: '🇷🇺' },
  { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳' },
  { code: 'BR', name: 'Brazil', dialCode: '+55', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', dialCode: '+52', flag: '🇲🇽' },
  { code: 'TH', name: 'Thailand', dialCode: '+66', flag: '🇹🇭' },
  { code: 'VN', name: 'Vietnam', dialCode: '+84', flag: '🇻🇳' },
  { code: 'PH', name: 'Philippines', dialCode: '+63', flag: '🇵🇭' },
  { code: 'ID', name: 'Indonesia', dialCode: '+62', flag: '🇮🇩' },
  { code: 'NZ', name: 'New Zealand', dialCode: '+64', flag: '🇳🇿' },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦' },
  { code: 'ZA', name: 'South Africa', dialCode: '+27', flag: '🇿🇦' },
  { code: 'CH', name: 'Switzerland', dialCode: '+41', flag: '🇨🇭' },
  { code: 'SE', name: 'Sweden', dialCode: '+46', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', dialCode: '+47', flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark', dialCode: '+45', flag: '🇩🇰' },
  { code: 'FI', name: 'Finland', dialCode: '+358', flag: '🇫🇮' },
  { code: 'PL', name: 'Poland', dialCode: '+48', flag: '🇵🇱' },
  { code: 'AT', name: 'Austria', dialCode: '+43', flag: '🇦🇹' },
  { code: 'BE', name: 'Belgium', dialCode: '+32', flag: '🇧🇪' },
  { code: 'PT', name: 'Portugal', dialCode: '+351', flag: '🇵🇹' },
  { code: 'IE', name: 'Ireland', dialCode: '+353', flag: '🇮🇪' },
  { code: 'GR', name: 'Greece', dialCode: '+30', flag: '🇬🇷' },
  { code: 'TR', name: 'Turkey', dialCode: '+90', flag: '🇹🇷' },
  { code: 'IL', name: 'Israel', dialCode: '+972', flag: '🇮🇱' },
  { code: 'EG', name: 'Egypt', dialCode: '+20', flag: '🇪🇬' },
  { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', dialCode: '+57', flag: '🇨🇴' },
  { code: 'PE', name: 'Peru', dialCode: '+51', flag: '🇵🇪' },
];

// Filter countries based on whitelist
const allowedCountries = countries.filter(c =>
  ALLOWED_PHONE_COUNTRIES.includes(
    c.code as (typeof ALLOWED_PHONE_COUNTRIES)[number]
  )
);

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
    const [selectedCountry, setSelectedCountry] =
      useState<Country>(defaultCountry);
    const [nationalNumber, setNationalNumber] = useState('');

    const selectedCountryData = useMemo(
      () =>
        allowedCountries.find(c => c.code === selectedCountry) ||
        allowedCountries[0],
      [selectedCountry]
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
        <input
          ref={ref}
          type="tel"
          value={nationalNumber}
          onChange={handleInputChange}
          disabled={disabled}
          placeholder={placeholder}
          className="h-full flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        />
      </div>
    );
  }
);

PhoneNumberInput.displayName = 'PhoneNumberInput';

export { PhoneNumberInput };
