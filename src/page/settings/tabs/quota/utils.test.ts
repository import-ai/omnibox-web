import {
  formatCredits,
  formatExpiration,
  getSubscriptionPlanLabelKey,
} from './utils';

jest.mock('i18next', () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

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

  it('keeps the basic label when a previous premium plan has expired', () => {
    expect(
      getSubscriptionPlanLabelKey({ expired: true, expire_date: null })
    ).toBe('quota.basic_plan');
  });

  it('uses the premium label when an active premium plan exists', () => {
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

describe('formatCredits', () => {
  it('groups thousands and appends the credit unit', () => {
    expect(formatCredits(6800000)).toBe('6,800,000 quota.credit_unit');
  });

  it('renders a zero balance without a separator', () => {
    expect(formatCredits(0)).toBe('0 quota.credit_unit');
  });
});
