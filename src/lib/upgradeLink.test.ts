import type { i18n } from 'i18next';

import { getUpgradeLink } from './upgradeLink';

describe('getUpgradeLink', () => {
  it('includes the current namespace in the localized pricing link', () => {
    const i18nInstance = { language: 'zh-CN' } as i18n;

    expect(getUpgradeLink(i18nInstance, 'namespace-1')).toBe(
      '/zh-cn/pricing?namespace=namespace-1'
    );
  });

  it('marks pricing links opened from the app', () => {
    const i18nInstance = { language: 'en' } as i18n;

    expect(getUpgradeLink(i18nInstance, 'namespace-1', true)).toBe(
      '/en/pricing?namespace=namespace-1&source=app'
    );
  });
});
