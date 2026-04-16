export const notificationDialogContentClassName =
  'grid-rows-[auto_minmax(0,1fr)] w-[calc(100vw-32px)] max-w-[694px] h-[calc(100vh-32px)] max-h-[690px] gap-2 overflow-hidden sm:rounded-2xl border border-neutral-200 bg-white px-4 py-5 dark:border-neutral-800 dark:bg-neutral-900';

export const notificationMetaWidthClassName = 'w-[112px] sm:w-[140px]';

export const notificationMetaColumnClassName =
  'flex min-w-0 flex-col items-end gap-1 text-right';

export function filterUnexpiredNotifications<
  T extends { expire_at: string | null },
>(items: T[], now: number = Date.now()) {
  return items.filter(item => {
    if (!item.expire_at) {
      return true;
    }

    const expireAt = new Date(item.expire_at).getTime();

    return Number.isNaN(expireAt) || expireAt > now;
  });
}
