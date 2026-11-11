import type { i18n } from 'i18next';

import { getUpgradeLink } from './upgradeLink';

describe('getUpgradeLink', () => {
  it('includes the current namespace in the localized pricing link', () => {
    const i18nInstance = { language: 'zh-CN' } as i18n;

    expect(getUpgradeLink(i18nInstance, 'namespace-1')).toBe(
      '/zh-cn/pricing?namespace=namespace-1'
    );
  });

  it('includes the pricing entry and extra tab parameter', () => {
    const i18nInstance = { language: 'zh-CN' } as i18n;

    expect(
      getUpgradeLink(i18nInstance, 'namespace-1', 'namespace_create', {
        tab: 'purchase_space',
      })
    ).toBe(
      '/zh-cn/pricing?namespace=namespace-1&entry=namespace_create&tab=purchase_space'
    );
  });
});
