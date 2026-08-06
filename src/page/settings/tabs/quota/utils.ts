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
