import { ALLOWED_EMAIL_DOMAINS } from '@/const';

/**
 * Check if an email domain is in the allowed list
 */
export function isAllowedEmailDomain(email: string): boolean {
  const domain = email.split('@')[1];
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
}

/**
 * Create a validation function for email domains with custom error message
 */
export function createEmailDomainValidator(errorMessage: string) {
  return (email: string) => isAllowedEmailDomain(email) || errorMessage;
}

/**
 * Get the domain from an email address
 */
export function getEmailDomain(email: string): string {
  return email.split('@')[1] || '';
}
