import {
  type AutoRenewal,
  formatAutoRenewalAmount,
  formatAutoRenewalDate,
  getAutoRenewalView,
} from './autoRenewal';

const NOW = new Date('2026-07-22T12:00:00.000Z');

function renewal(
  status: AutoRenewal['status'],
  currentPeriodEnd: string | null = null
): AutoRenewal {
  return {
    id: 'renewal-id',
    namespace_id: 'namespace-id',
    price_id: 'price-id',
    tier: 'basic',
    status,
    contract_active: false,
    can_cancel: true,
    channel: 'wechat',
    amount: 500,
    currency: 'CNY',
    current_period_end: currentPeriodEnd,
    next_billing_at: null,
    pre_notified_at: null,
    retry_count: 0,
    canceled_at: null,
  };
}

describe('auto-renewal view', () => {
  it.each(['active', 'past_due'] as const)('shows %s as enabled', status => {
    expect(getAutoRenewalView(renewal(status), NOW)).toBe('enabled');
  });

  it('shows canceling as awaiting provider confirmation', () => {
    expect(getAutoRenewalView(renewal('canceling'), NOW)).toBe('canceling');
  });

  it('shows an unexpired canceled renewal as disabled', () => {
    expect(
      getAutoRenewalView(renewal('canceled', '2026-07-22T12:00:01.000Z'), NOW)
    ).toBe('disabled');
  });

  it('shows a failed renewal while its provider contract remains active', () => {
    expect(
      getAutoRenewalView({ ...renewal('failed'), contract_active: true }, NOW)
    ).toBe('failed');
  });

  it('shows a signed contract before the initial payment', () => {
    expect(
      getAutoRenewalView({ ...renewal('signing'), contract_active: true }, NOW)
    ).toBe('signing');
  });

  it.each([
    ['at the expiry boundary', 'canceled', '2026-07-22T12:00:00.000Z'],
    ['after expiry', 'canceled', '2026-07-22T11:59:59.000Z'],
    ['while the provider contract is unconfirmed', 'signing', null],
    ['after failure', 'failed', null],
  ] as const)('hides a renewal %s', (_name, status, currentPeriodEnd) => {
    expect(
      getAutoRenewalView(renewal(status, currentPeriodEnd), NOW)
    ).toBeNull();
  });

  it('hides a missing renewal', () => {
    expect(getAutoRenewalView(null, NOW)).toBeNull();
  });
});

describe('auto-renewal formatting', () => {
  it('formats a renewal date as a local calendar date', () => {
    expect(formatAutoRenewalDate('2026-08-22T04:00:00.000Z')).toBe(
      '2026-08-22'
    );
  });

  it('formats an amount stored in cents', () => {
    expect(formatAutoRenewalAmount(500, 'CNY', 'zh-CN')).toBe('¥5.00');
  });
});
