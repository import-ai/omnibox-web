export const notificationDialogContentClassName =
  'grid-rows-[auto_minmax(0,1fr)] w-[calc(100vw-32px)] max-w-[694px] h-[calc(100vh-32px)] max-h-[690px] gap-2 overflow-hidden sm:rounded-2xl border border-neutral-200 bg-white px-4 py-5 dark:border-neutral-800 dark:bg-neutral-900';

export const notificationMetaWidthClassName = 'w-[112px] sm:w-[140px]';

export const notificationMetaColumnClassName =
  'flex min-w-0 flex-col items-end gap-1 text-right';

export const NOTIFICATION_POLL_INTERVAL_MS = 10_000;

export function getNotificationHasMore(pagination: {
  offset: number;
  limit: number;
  total: number;
}) {
  return pagination.offset + pagination.limit < pagination.total;
}

export function markNotificationItemsAsRead<
  T extends { id: string; status: 'unread' | 'read'; readed_at: string | null },
>(items: T[], notificationId: string, readAt: string) {
  let wasUnread = false;

  const nextItems = items.map(item => {
    if (item.id !== notificationId) {
      return item;
    }

    wasUnread = item.status === 'unread';

    if (!wasUnread) {
      return item;
    }

    return {
      ...item,
      status: 'read',
      readed_at: item.readed_at ?? readAt,
    };
  });

  return {
    items: nextItems,
    wasUnread,
  };
}

export function startNotificationPolling(
  refresh: () => Promise<void> | void,
  intervalMs: number = NOTIFICATION_POLL_INTERVAL_MS
) {
  const timer = setInterval(refresh, intervalMs);

  return () => {
    clearInterval(timer);
  };
}
