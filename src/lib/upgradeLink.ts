import type { i18n as I18nType } from 'i18next';

function isAppRuntime(): boolean {
  if (typeof window === 'undefined') return false;

  return Boolean(
    (window as Window & { isNativeApp?: boolean }).isNativeApp ||
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone
  );
}

export function getUpgradeLink(
  i18n: I18nType,
  namespaceId?: string,
  appRuntime = isAppRuntime()
): string {
  const rawLang = i18n.language || 'zh-cn';
  const lang = rawLang.startsWith('zh') ? 'zh-cn' : 'en';
  const params = new URLSearchParams();
  if (namespaceId) params.set('namespace', namespaceId);
  if (appRuntime) params.set('source', 'app');
  const query = params.toString();

  return `/${lang}/pricing${query ? `?${query}` : ''}`;
}
