import { NamespaceTier } from '@/interface';

import { getPricingEntryLabelKey } from './pricingEntry';

describe('getPricingEntryLabelKey', () => {
  it('shows upgrade for basic and expired spaces, and pricing for active premium spaces', () => {
    expect(getPricingEntryLabelKey({ tier: NamespaceTier.BASIC })).toBe(
      'footer.upgrade_version'
    );
    expect(
      getPricingEntryLabelKey({
        tier: NamespaceTier.PREMIUM,
        expired: true,
      })
    ).toBe('footer.upgrade_version');
    expect(
      getPricingEntryLabelKey({
        tier: NamespaceTier.PREMIUM,
        expired: false,
      })
    ).toBe('footer.view_pricing');
  });

  it('uses neutral pricing copy while namespace data is unavailable', () => {
    expect(getPricingEntryLabelKey()).toBe('footer.view_pricing');
  });
});
