/** @jest-environment jsdom */

import { NamespaceTier } from '@/interface';

import {
  creditsLowBalanceAnalyticsProps,
  creditsToStoredUnits,
  getCreditsLowBalanceDismissalKey,
  isCreditsLowBalance,
  readCreditsLowBalanceDismissed,
  resolveCreditsLowBalance,
  storedUnitsToCredits,
  writeCreditsLowBalanceDismissed,
} from './creditsLowBalance';

describe('credits low balance', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('uses the assigned threshold and falls back per tier', () => {
    const experiment = { experiment_id: 4, group_id: 8, basic_threshold: 50 };
    expect(resolveCreditsLowBalance(NamespaceTier.BASIC, experiment)).toEqual({
      variant: 'ab:4:8',
      thresholdCredits: 50,
    });
    expect(resolveCreditsLowBalance(NamespaceTier.PREMIUM, experiment)).toEqual(
      {
        variant: 'default',
        thresholdCredits: 430,
      }
    );
    expect(resolveCreditsLowBalance(NamespaceTier.BASIC).thresholdCredits).toBe(
      10
    );
  });

  it('only treats a positive balance below the threshold as low', () => {
    expect(isCreditsLowBalance(0, 10)).toBe(false);
    expect(isCreditsLowBalance(creditsToStoredUnits(9.99), 10)).toBe(true);
    expect(isCreditsLowBalance(creditsToStoredUnits(10), 10)).toBe(false);
    expect(isCreditsLowBalance(creditsToStoredUnits(430), 430)).toBe(false);
  });

  it('carries over old dismissals without resurrecting them after recovery', () => {
    const key = getCreditsLowBalanceDismissalKey({
      namespaceId: 'namespace-a',
      tier: NamespaceTier.BASIC,
      userId: 'user-a',
    });
    localStorage.setItem(
      'omnibox:credits-low-balance:dismissed:user-a:namespace-a:basic:b',
      '1'
    );
    expect(readCreditsLowBalanceDismissed(key)).toBe(50);
    writeCreditsLowBalanceDismissed(key, 0);
    expect(readCreditsLowBalanceDismissed(key)).toBe(0);
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
