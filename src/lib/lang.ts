import type { i18n as I18nType } from 'i18next';

export function getLangOnly(i18n: I18nType): string {
  return i18n.language.split('-')[0] || 'en';
}
