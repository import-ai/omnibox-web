import isEmail from '@/lib/isEmail';

export const SUPPORTED_EMAIL_DOMAINS = [
  'gmail.com',
  'outlook.com',
  'hotmail.com',
  '163.com',
  'qq.com',
  '126.com',
  'foxmail.com',
  'yeah.net',
  'sina.com',
  'yahoo.com',
  'sohu.com',
] as const;

export function isSupportedEmail(email: string): boolean {
  if (!isEmail(email)) {
    return false;
  }

  const domain = email.slice(email.lastIndexOf('@') + 1).toLowerCase();
  return SUPPORTED_EMAIL_DOMAINS.some(
    supportedDomain => supportedDomain === domain
  );
}

export function getEmailSuggestions(email: string): string[] {
  const atIndex = email.indexOf('@');
  if (atIndex <= 0 || email.indexOf('@', atIndex + 1) >= 0) {
    return [];
  }

  const localPart = email.slice(0, atIndex);
  const domainPrefix = email.slice(atIndex + 1).toLowerCase();

  const suggestions = SUPPORTED_EMAIL_DOMAINS.filter(domain =>
    domain.startsWith(domainPrefix)
  ).map(domain => `${localPart}@${domain}`);

  if (
    suggestions.length === 1 &&
    suggestions[0].toLowerCase() === email.toLowerCase()
  ) {
    return [];
  }

  return suggestions;
}
