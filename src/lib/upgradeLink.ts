import type { i18n as I18nType } from 'i18next';

const ENTRY_PATTERN = /^[a-z][a-z0-9_]{0,39}$/;

export function getUpgradeLink(
  i18n: I18nType,
  namespaceId?: string,
  entry?: string,
  extraParams: Record<string, string | undefined> = {}
): string {
  const rawLang = i18n.language || 'zh-cn';
  const lang = rawLang.startsWith('zh') ? 'zh-cn' : 'en';
  const params = new URLSearchParams();
  if (namespaceId) params.set('namespace', namespaceId);
  if (entry && ENTRY_PATTERN.test(entry)) params.set('entry', entry);
  Object.entries(extraParams).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return `/${lang}/pricing${query ? `?${query}` : ''}`;
}
