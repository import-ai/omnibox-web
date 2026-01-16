import type { CountryCode } from 'libphonenumber-js';

export interface CountryData {
  code: CountryCode;
  name: string;
  dialCode: string;
  flag: string;
}

export const countries: CountryData[] = [
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
