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

/**
 * Round `credits / divisor` to at most two decimals. Scaling by 100 before
 * dividing keeps the arithmetic on integers, so a value like 12,345 / 1000 does
 * not land on the wrong side of a float boundary: 12.345 is stored as
 * 12.34499..., which `toFixed(2)` would round down to 12.34.
 */
function scaleCredits(credits: number, divisor: number) {
  return Math.round((credits * 100) / divisor) / 100;
}

/** Exact count with thousands separators — what a tooltip reveals. */
export function formatCreditsExact(credits: number) {
  return `${credits.toLocaleString()} ${i18next.t('quota.credit_unit')}`;
}

/**
 * Agent credits at a glance: K from 10,000, M from 1,000,000, at most two
 * decimals (trailing zeros dropped, so 6,800,000 reads 6.8M not 6.80M).
 * Anything smaller stays exact — 9,999 is no harder to read than 9.99K.
 */
export function formatCredits(credits: number) {
  const unit = i18next.t('quota.credit_unit');
  const magnitude = Math.abs(credits);

  if (magnitude >= 1_000_000) {
    return `${scaleCredits(credits, 1_000_000)}M ${unit}`;
  }
  if (magnitude >= 10_000) {
    const thousands = scaleCredits(credits, 1_000);
    // 999,999 rounds to 1000.00K, which reads worse than promoting it to 1M.
    return Math.abs(thousands) >= 1_000
      ? `${scaleCredits(credits, 1_000_000)}M ${unit}`
      : `${thousands}K ${unit}`;
  }
  return formatCreditsExact(credits);
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
