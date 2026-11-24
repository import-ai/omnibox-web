/** @jest-environment jsdom */

import { NamespaceTier } from '@/interface';

import {
  clearCreditsLowBalanceDismissed,
  creditsLowBalanceAnalyticsProps,
  creditsToStoredUnits,
  getCreditsLowBalanceDismissalKey,
  getCreditsLowBalanceThresholdCredits,
  getCreditsLowBalanceVariant,
  isCreditsLowBalance,
  readCreditsLowBalanceDismissed,
  storedUnitsToCredits,
  writeCreditsLowBalanceDismissed,
} from './creditsLowBalance';

describe('credits low balance', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('assigns Basic users to stable 10 or 50 Kibble buckets', () => {
    expect(getCreditsLowBalanceVariant(NamespaceTier.BASIC, 'user-a')).toBe(
      'a'
    );
    expect(getCreditsLowBalanceVariant(NamespaceTier.BASIC, 'user-b')).toBe(
      'b'
    );
    expect(getCreditsLowBalanceThresholdCredits('a')).toBe(10);
    expect(getCreditsLowBalanceThresholdCredits('b')).toBe(50);
  });

  it('uses a fixed 430 Kibble threshold for Premium', () => {
    expect(getCreditsLowBalanceVariant(NamespaceTier.PREMIUM, 'user-a')).toBe(
      'premium'
    );
    expect(getCreditsLowBalanceThresholdCredits('premium')).toBe(430);
  });

  it('only treats a positive balance below the threshold as low', () => {
    expect(isCreditsLowBalance(0, 10)).toBe(false);
    expect(isCreditsLowBalance(creditsToStoredUnits(9.99), 10)).toBe(true);
    expect(isCreditsLowBalance(creditsToStoredUnits(10), 10)).toBe(false);
    expect(isCreditsLowBalance(creditsToStoredUnits(430), 430)).toBe(false);
  });

  it('persists dismissal per user, namespace, tier, and experiment variant', () => {
    const key = getCreditsLowBalanceDismissalKey({
      namespaceId: 'namespace-a',
      tier: NamespaceTier.BASIC,
      userId: 'user-a',
      variant: 'a',
    });

    expect(readCreditsLowBalanceDismissed(key)).toBe(false);
    expect(writeCreditsLowBalanceDismissed(key)).toBe(true);
    expect(readCreditsLowBalanceDismissed(key)).toBe(true);
    expect(clearCreditsLowBalanceDismissed(key)).toBe(true);
    expect(readCreditsLowBalanceDismissed(key)).toBe(false);
  });

  it('reports displayed Kibble values to analytics', () => {
    expect(storedUnitsToCredits(12_345_678)).toBe(12.35);
    expect(
      creditsLowBalanceAnalyticsProps({
        namespaceId: 'namespace-a',
        remainingCredits: 12_345_678,
        role: 'owner',
        surface: 'banner',
        thresholdCredits: 50,
        tier: NamespaceTier.BASIC,
        variant: 'b',
      })
    ).toEqual({
      namespace_id: 'namespace-a',
      surface: 'banner',
      role: 'owner',
      namespace_tier: NamespaceTier.BASIC,
      experiment_variant: 'b',
      threshold_kibble: 50,
      remaining_kibble: 12.35,
      model: 'agent_2_1',
    });
  });
});
