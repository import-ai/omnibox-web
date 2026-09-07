import {
  formatCredits,
  formatCreditsExact,
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
  const UNIT = 'quota.credit_unit';

  it('keeps counts below 10,000 exact', () => {
    expect(formatCredits(0)).toBe(`0 ${UNIT}`);
    expect(formatCredits(999)).toBe(`999 ${UNIT}`);
    expect(formatCredits(9999)).toBe(`9,999 ${UNIT}`);
  });

  it('switches to K at 10,000 and to M at 1,000,000', () => {
    expect(formatCredits(10_000)).toBe(`10K ${UNIT}`);
    expect(formatCredits(999_999)).toBe(`1M ${UNIT}`);
    expect(formatCredits(1_000_000)).toBe(`1M ${UNIT}`);
  });

  it('keeps at most two decimals and drops trailing zeros', () => {
    expect(formatCredits(1_230_000)).toBe(`1.23M ${UNIT}`);
    expect(formatCredits(6_800_000)).toBe(`6.8M ${UNIT}`);
    expect(formatCredits(6_862_291)).toBe(`6.86M ${UNIT}`);
    expect(formatCredits(15_500)).toBe(`15.5K ${UNIT}`);
  });

  it('rounds half up rather than truncating', () => {
    // 12,345 / 1000 is stored as 12.34499..., so toFixed(2) would give 12.34.
    expect(formatCredits(12_345)).toBe(`12.35K ${UNIT}`);
    expect(formatCredits(1_234_500)).toBe(`1.23M ${UNIT}`);
    expect(formatCredits(1_235_000)).toBe(`1.24M ${UNIT}`);
  });

  it('formats a settled overdraft rather than dropping the sign', () => {
    expect(formatCredits(-2_500_000)).toBe(`-2.5M ${UNIT}`);
    expect(formatCredits(-250)).toBe(`-250 ${UNIT}`);
  });
});

describe('formatCreditsExact', () => {
  it('keeps thousands separators at every magnitude', () => {
    expect(formatCreditsExact(6_862_291)).toBe('6,862,291 quota.credit_unit');
    expect(formatCreditsExact(0)).toBe('0 quota.credit_unit');
  });
});
