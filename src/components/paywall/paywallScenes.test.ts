import * as en from '@/i18n/locales/en.json';
import * as zh from '@/i18n/locales/zh.json';
import { NamespaceTier } from '@/interface';

import { PAYWALL_SCENES, paywallCopyKey } from './paywallScenes';
import type { PaywallScene } from './paywallTypes';

const ENTRY_PATTERN = /^[a-z][a-z0-9_]{0,39}$/;

describe('paywall scenes', () => {
  it('uses unique pricing entries accepted by getUpgradeLink', () => {
    const entries = Object.values(PAYWALL_SCENES).map(item => item.entry);
    expect(new Set(entries).size).toBe(entries.length);
    entries.forEach(entry => expect(entry).toMatch(ENTRY_PATTERN));
  });

  it('does not send premium fair-use caps to pricing', () => {
    (
      [
        'search_filter_limit',
        'smart_filter_limit',
        'rss_link_limit',
        'smart_folder_limit',
        'rss_folder_limit',
      ] as PaywallScene[]
    ).forEach(scene => {
      expect(PAYWALL_SCENES[scene].premiumUpgrade).toBe(false);
    });
    expect(PAYWALL_SCENES.storage_limit.premiumUpgrade).not.toBe(false);
    expect(PAYWALL_SCENES.credits_limit.premiumUpgrade).not.toBe(false);
  });

  it.each(Object.keys(PAYWALL_SCENES) as PaywallScene[])(
    'has complete Chinese and English copy for %s',
    scene => {
      const tiers = PAYWALL_SCENES[scene].tiered
        ? [NamespaceTier.BASIC, NamespaceTier.PREMIUM]
        : [NamespaceTier.BASIC];

      tiers.forEach(tier => {
        const key = paywallCopyKey(scene, tier);
        const path = key.split('.').slice(1);
        [zh, en].forEach(locale => {
          const copy = path.reduce<unknown>(
            (value, segment) =>
              value && typeof value === 'object'
                ? (value as Record<string, unknown>)[segment]
                : undefined,
            locale.paywall
          ) as Record<string, string> | undefined;
          expect(copy?.title).toBeTruthy();
          expect(copy?.description).toBeTruthy();
          expect(copy?.cta).toBeTruthy();
        });
      });
    }
  );
});
