export function formatRelativeTime(
  value: string,
  locale: string,
  justNow: string
) {
  const elapsedSeconds = (new Date(value).getTime() - Date.now()) / 1000;
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ];
  const [unit, seconds] = units.find(
    ([, unitSeconds]) => Math.abs(elapsedSeconds) >= unitSeconds
  ) ?? ['minute', 60];
  const amount = Math.round(elapsedSeconds / seconds);
  if (unit === 'minute' && amount === 0) return justNow;
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(
    amount,
    unit
  );
}
