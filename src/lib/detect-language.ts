export function detectBrowserLanguage(): string {
  if (navigator?.language) {
    return navigator.language;
  }
  if (navigator?.languages && navigator.languages.length > 0) {
    return navigator.languages[0];
  }
  return 'en-US';
}
