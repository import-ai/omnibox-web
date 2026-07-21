export const notificationDialogContentClassName =
  'grid-rows-[auto_minmax(0,1fr)] h-[calc(100vh-32px)] max-h-[820px] w-[calc(100vw-32px)] max-w-[960px] gap-0 overflow-hidden border border-neutral-200 bg-white px-6 py-5 dark:border-neutral-800 dark:bg-neutral-900 sm:rounded-2xl';

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

export function startResettableNotificationPolling(
  refresh: () => Promise<void> | void,
  intervalMs: number = NOTIFICATION_POLL_INTERVAL_MS
) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clearTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const scheduleNext = () => {
    clearTimer();
    timer = setTimeout(() => {
      Promise.resolve(refresh()).finally(scheduleNext);
    }, intervalMs);
  };

  scheduleNext();

  return {
    restart: scheduleNext,
    stop: clearTimer,
  };
}
