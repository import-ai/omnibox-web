import i18next from 'i18next';

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
    return `${seconds}${i18next.t('quota.time.seconds')}`;
  }
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0
    ? `${minutes}${i18next.t('quota.time.minutes')}${secs}${i18next.t('quota.time.seconds')}`
    : `${minutes}${i18next.t('quota.time.minutes')}`;
}

// Helper function to format time as minutes (for total quota display)
export function formatTimeAsMinutes(seconds: number) {
  const minutes = Math.ceil(seconds / 60);
  return `${minutes}${i18next.t('quota.time.minutes')}`;
}
