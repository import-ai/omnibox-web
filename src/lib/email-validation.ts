import { ALLOWED_EMAIL_DOMAINS } from '@/const';

/**
 * Check if an email domain is in the allowed list
 */
export function isAllowedEmailDomain(email: string): boolean {
  const domain = email.split('@')[1];
  console.log(ALLOWED_EMAIL_DOMAINS.includes(domain), domain);
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
}
