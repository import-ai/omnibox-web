import { NamespaceTier } from '@/interface';

import { getPricingEntryVariant } from './pricingEntry';

describe('getPricingEntryVariant', () => {
  it('uses upgrade for basic spaces and renew for premium spaces', () => {
    expect(getPricingEntryVariant({ tier: NamespaceTier.BASIC })).toBe(
      'upgrade'
    );
    expect(getPricingEntryVariant({ tier: NamespaceTier.PREMIUM })).toBe(
      'renew'
    );
  });

  it('uses upgrade for expired spaces regardless of their previous tier', () => {
    expect(
      getPricingEntryVariant({ expired: true, tier: NamespaceTier.BASIC })
    ).toBe('upgrade');
    expect(
      getPricingEntryVariant({ expired: true, tier: NamespaceTier.PREMIUM })
    ).toBe('upgrade');
  });

  it('does not choose an entry while namespace tier data is unavailable', () => {
    expect(getPricingEntryVariant()).toBeUndefined();
    expect(getPricingEntryVariant({})).toBeUndefined();
  });
});
