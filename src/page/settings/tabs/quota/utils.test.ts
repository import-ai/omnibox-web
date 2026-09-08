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
  const UNIT = 'quota.credit_unit';

  it('shows a millionth of the stored amount', () => {
    expect(formatCredits(0)).toBe(`0 ${UNIT}`);
    expect(formatCredits(1_200)).toBe(`0 ${UNIT}`);
    expect(formatCredits(525_680)).toBe(`0.53 ${UNIT}`);
    expect(formatCredits(462_452_200)).toBe(`462.45 ${UNIT}`);
  });

  it('drops trailing zeros but keeps a leading one', () => {
    expect(formatCredits(1_000_000)).toBe(`1 ${UNIT}`);
    expect(formatCredits(1_100_000)).toBe(`1.1 ${UNIT}`);
    expect(formatCredits(6_800_000)).toBe(`6.8 ${UNIT}`);
    expect(formatCredits(50_000)).toBe(`0.05 ${UNIT}`);
  });

  it('groups the integer part', () => {
    expect(formatCredits(8_000_000_000)).toBe(`8,000 ${UNIT}`);
  });

  it('switches to K at 10,000 and to M at 1,000,000 displayed credits', () => {
    expect(formatCredits(10_000_000_000)).toBe(`10K ${UNIT}`);
    expect(formatCredits(12_345_678_900)).toBe(`12.35K ${UNIT}`);
    expect(formatCredits(999_999_994_999)).toBe(`1M ${UNIT}`);
    expect(formatCredits(1_000_000_000_000)).toBe(`1M ${UNIT}`);
    expect(formatCredits(12_345_678_900_000)).toBe(`12.35M ${UNIT}`);
  });

  it('rounds half up rather than truncating', () => {
    // 12,345,000,000 / 1e9 is stored as 12.34499..., so toFixed(2) would give
    // 12.34.
    expect(formatCredits(12_345_000_000)).toBe(`12.35K ${UNIT}`);
  });

  it('formats a settled overdraft rather than dropping the sign', () => {
    expect(formatCredits(-2_500_000)).toBe(`-2.5 ${UNIT}`);
  });
});
