import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isBlank(value: string | null | undefined): boolean {
  return value === null || value === undefined || value === '';
}

export function buildUrl(
  url: string,
  params: Record<string, string | undefined | null>
): string {
  const filteredParams = Object.entries(params)
    .filter(([, value]) => !isBlank(value))
    .map(([key, value]) => `${key}=${encodeURIComponent(value!)}`)
    .join('&');

  if (!filteredParams) {
    return url;
  }

  return `${url}?${filteredParams}`;
}
