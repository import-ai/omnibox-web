import type { i18n as I18nType } from 'i18next';

export function getUpgradeLink(i18n: I18nType, namespaceId?: string): string {
  const rawLang = i18n.language || 'zh-cn';
  const lang = rawLang.startsWith('zh') ? 'zh-cn' : 'en';
  if (namespaceId) {
    return `/${lang}/pricing?namespace=${namespaceId}`;
  }
  return `/${lang}/pricing`;
}
