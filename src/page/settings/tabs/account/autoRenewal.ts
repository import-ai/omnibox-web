export type AutoRenewalStatus =
  | 'signing'
  | 'active'
  | 'canceling'
  | 'canceled'
  | 'failed'
  | 'past_due';

export interface AutoRenewal {
  id: string;
  namespace_id: string | null;
  price_id: string;
  tier: 'basic' | 'premium';
  status: AutoRenewalStatus;
  channel: 'wechat';
  amount: number;
  currency: string;
  current_period_end: string | null;
  next_billing_at: string | null;
  pre_notified_at: string | null;
  retry_count: number;
  canceled_at: string | null;
}

export type AutoRenewalView = 'enabled' | 'disabled';

export function getAutoRenewalView(
  renewal: AutoRenewal | null,
  now = new Date()
): AutoRenewalView | null {
  if (renewal && ['active', 'past_due', 'canceling'].includes(renewal.status)) {
    return 'enabled';
  }
  if (
    renewal?.status === 'canceled' &&
    renewal.current_period_end &&
    new Date(renewal.current_period_end) > now
  ) {
    return 'disabled';
  }
  return null;
}

export function formatAutoRenewalDate(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatAutoRenewalAmount(
  amount: number,
  currency: string,
  locale: string
) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100);
}
