import { formatExpiration, getSubscriptionPlanLabelKey } from './utils';

const t = (key: string, opts?: Record<string, unknown>) => {
  if (key === 'quota.days_remaining') {
    return `${opts?.days} days (${opts?.date})`;
  }
  return key;
};

describe('getSubscriptionPlanLabelKey', () => {
  it('keeps the basic label when only the basic plan has an expiration', () => {
    expect(getSubscriptionPlanLabelKey(undefined)).toBe('quota.basic_plan');
  });

  it('uses the premium label when a premium plan exists', () => {
    expect(
      getSubscriptionPlanLabelKey({ expired: false, expire_date: null })
    ).toBe('quota.premium_plan');
  });
});

describe('formatExpiration', () => {
  it('shows expired before forever for an expired plan without a date', () => {
    expect(formatExpiration(true, null, t)).toBe('namespace.tier.expired');
  });

  it('shows forever for an active plan without a date', () => {
    expect(formatExpiration(false, null, t)).toBe('namespace.tier.forever');
  });
});
