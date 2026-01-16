import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Check if running in Chrome PWA standalone mode
function isChromeStandalone(): boolean {
  const isChrome =
    /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  return isChrome && isStandalone;
}

// Set document title, skip in Chrome standalone mode to avoid mixed name display
export function setDocumentTitle(title: string): void {
  if (!isChromeStandalone()) {
    document.title = title;
  }
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
