import i18next from 'i18next';

type UsageExpirationLike = {
  expired: boolean;
  expire_date: string | null;
};

type Translate = (key: string, opts?: Record<string, unknown>) => string;

// Helper function to format storage size (bytes to readable format)
export function formatStorage(bytes: number) {
  const kb = bytes / 1024;
  const mb = kb / 1024;
  const gb = mb / 1024;

  const formatValue = (num: number) => parseFloat(num.toFixed(2));

  if (kb < 0.01) {
    return '0 KB';
  }
  if (mb < 1) {
    return `${formatValue(kb)} KB`;
  }
  if (gb < 1) {
    return `${formatValue(mb)} MB`;
  }
  return `${formatValue(gb)} GB`;
}

// Helper function to format time (seconds to minutes)
export function formatTime(seconds: number) {
  if (seconds < 60) {
    return `${seconds} ${i18next.t('quota.time.seconds')}`;
  }
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0
    ? `${minutes} ${i18next.t('quota.time.minutes')} ${secs} ${i18next.t('quota.time.seconds')}`
    : `${minutes} ${i18next.t('quota.time.minutes')}`;
}

// Helper function to format time as minutes (for total quota display)
export function formatTimeAsMinutes(seconds: number) {
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} ${i18next.t('quota.time.minutes')}`;
}

/** One displayed credit is a million stored units. */
const CREDIT_SCALE = 1_000_000;

/**
 * `credits / divisor` rounded to two decimals, kept as integer hundredths.
 * Scaling by 100 before dividing keeps the rounding on integers: 12,345,000,000
 * / 1e9 is stored as 12.34499..., which `toFixed(2)` would round down to 12.34.
 */
function creditHundredths(credits: number, divisor: number) {
  return Math.round((credits * 100) / divisor);
}

/**
 * Integer hundredths as a signed, thousands-separated decimal string, with
 * trailing zeros dropped so a round number reads 1 rather than 1.00. Built from
 * the remainder rather than from `Intl` fraction-digit options, which Hermes
 * does not reliably honour; `toLocaleString` is used only for grouping, exactly
 * as the previous formatter did.
 */
function renderHundredths(hundredths: number) {
  const sign = hundredths < 0 ? '-' : '';
  const abs = Math.abs(hundredths);
  const whole = Math.floor(abs / 100).toLocaleString();
  // Only trailing zeros go: 5 hundredths stays 0.05, 10 becomes 0.1.
  const fraction = String(abs % 100)
    .padStart(2, '0')
    .replace(/0+$/, '');
  return fraction ? `${sign}${whole}.${fraction}` : `${sign}${whole}`;
}

/**
 * Agent credits as the user sees them: a millionth of the stored amount, to at
 * most two decimals, with K from 10,000 and M from 1,000,000 displayed credits
 * so a very large balance stays readable.
 */
export function formatCredits(credits: number) {
  const unit = i18next.t('quota.credit_unit');
  const magnitude = Math.abs(credits);
  const millions = 1_000_000 * CREDIT_SCALE;

  if (magnitude >= millions) {
    return `${renderHundredths(creditHundredths(credits, millions))}M ${unit}`;
  }
  if (magnitude >= 10_000 * CREDIT_SCALE) {
    const thousands = creditHundredths(credits, 1_000 * CREDIT_SCALE);
    // 999,999.995 displayed credits rounds to 1000K, which reads worse than
    // promoting it to 1M.
    return Math.abs(thousands) >= 100_000
      ? `${renderHundredths(creditHundredths(credits, millions))}M ${unit}`
      : `${renderHundredths(thousands)}K ${unit}`;
  }
  return `${renderHundredths(creditHundredths(credits, CREDIT_SCALE))} ${unit}`;
}

export function getSubscriptionPlanLabelKey(premium?: UsageExpirationLike) {
  return premium && !premium.expired
    ? 'quota.premium_plan'
    : 'quota.basic_plan';
}

export function formatExpiration(
  expired: boolean,
  expireDate: string | null,
  t: Translate,
  now = new Date()
) {
  if (expired) {
    return t('namespace.tier.expired');
  }
  if (expireDate === null) {
    return t('namespace.tier.forever');
  }
  const expireDateObj = new Date(expireDate);
  const diffTime = expireDateObj.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const formattedDate = `${expireDateObj.getFullYear()}/${String(expireDateObj.getMonth() + 1).padStart(2, '0')}/${String(expireDateObj.getDate()).padStart(2, '0')}`;
  return t('quota.days_remaining', {
    days: diffDays,
    date: formattedDate,
  });
}
