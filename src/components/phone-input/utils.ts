import { parsePhoneNumberFromString } from 'libphonenumber-js';

export function formatPhone(phone: string) {
  const parsed = parsePhoneNumberFromString(phone);
  if (parsed) {
    return `+${parsed.countryCallingCode} ${parsed.nationalNumber}`;
  }
  return phone;
}
