import i18next from 'i18next';

// Helper function to format storage size (MB to GB)
export function formatStorage(mb: number) {
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)}GB` : `${mb}MB`;
}

// Helper function to format time (seconds to minutes/hours)
export function formatTime(seconds: number) {
  if (seconds < 60) return `${seconds}${i18next.t('quota.time.seconds')}`;
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0
      ? `${minutes}${i18next.t('quota.time.minutes')}${secs}${i18next.t('quota.time.seconds')}`
      : `${minutes}${i18next.t('quota.time.minutes')}`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return minutes > 0
    ? `${hours}${i18next.t('quota.time.hours')}${minutes}${i18next.t('quota.time.minutes')}`
    : `${hours}${i18next.t('quota.time.hours')}`;
}
