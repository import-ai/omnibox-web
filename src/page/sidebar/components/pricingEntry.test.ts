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

  it('does not choose an entry while namespace data is unavailable', () => {
    expect(getPricingEntryVariant()).toBeUndefined();
  });
});
