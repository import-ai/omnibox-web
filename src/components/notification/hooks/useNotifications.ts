import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { http } from '@/lib/request';

import type {
  NotificationApiResponse,
  NotificationDetail,
  NotificationDetailResponse,
  NotificationFilter,
  NotificationItem,
  NotificationUnreadCountResponse,
} from '../types';
import {
  NOTIFICATION_POLL_INTERVAL_MS,
  startNotificationPolling,
} from '../utils';

const DEFAULT_LIMIT = 20;
const NOTIFICATION_UNREAD_COUNT_UPDATED = 'notification-unread-count-updated';
const unreadCountCache = new Map<string, number>();

interface NotificationUnreadCountUpdatedDetail {
  count: number;
  namespaceId: string;
}

function dispatchUnreadCountUpdated(namespaceId: string, count: number) {
  unreadCountCache.set(namespaceId, count);
  queueMicrotask(() => {
    window.dispatchEvent(
      new CustomEvent<NotificationUnreadCountUpdatedDetail>(
        NOTIFICATION_UNREAD_COUNT_UPDATED,
        {
          detail: {
            count,
            namespaceId,
          },
        }
      )
    );
  });
}

export function startUnreadCountPolling(
  fetchUnreadCount: () => Promise<void> | void
) {
  return startNotificationPolling(
    fetchUnreadCount,
    NOTIFICATION_POLL_INTERVAL_MS
  );
}

export function useNotifications(filter: NotificationFilter) {
  const params = useParams();
  const namespaceId = params.namespace_id || '';
  const namespaceQuery = namespaceId
    ? `?${new URLSearchParams({ namespaceId }).toString()}`
    : '';
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [clearingUnread, setClearingUnread] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [unreadCount, setUnreadCount] = useState(
    unreadCountCache.get(namespaceId) ?? 0
  );

  // get unread count
  const fetchUnreadCount = useCallback(async () => {
    const response = await http.get<NotificationUnreadCountResponse>(
      `/notifications/unread/count${namespaceQuery}`
    );
    setUnreadCount(response.unread_count);
    dispatchUnreadCountUpdated(namespaceId, response.unread_count);
  }, [namespaceId, namespaceQuery]);

  // get notifications
  const fetchNotifications = useCallback(
    async (nextPage: number, append: boolean) => {
      const query = new URLSearchParams({
        status: filter,
        offset: nextPage.toString(),
        limit: DEFAULT_LIMIT.toString(),
      });
      if (namespaceId) {
        query.append('namespaceId', namespaceId);
      }
      const response = await http.get<NotificationApiResponse>(
        `/notifications?${query.toString()}`
      );
      const { list } = response;
      setItems(previousItems => (append ? [...previousItems, ...list] : list));
      setHasMore(response.pagination.has_more);
      setPage(response.pagination.offset);
    },
    [filter, namespaceId]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchNotifications(1, false), fetchUnreadCount()]);
    } finally {
      setLoading(false);
    }
  }, [fetchNotifications, fetchUnreadCount]);

  // Load more
  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) {
      return;
    }

    setLoadingMore(true);
    try {
      await fetchNotifications(page + 1, true);
    } finally {
      setLoadingMore(false);
    }
  }, [fetchNotifications, hasMore, loading, loadingMore, page]);

  // Fetch detail
  const fetchNotificationDetail = useCallback(
    async (id: string) => {
      return http.get<NotificationDetailResponse>(
        `/notifications/${id}${namespaceQuery}`,
        {
          mute: true,
        }
      ) as Promise<NotificationDetail>;
    },
    [namespaceQuery]
  );

  // Mark as read
  const markNotificationRead = useCallback(
    async (id: string) => {
      await http.patch(`/notifications/${id}${namespaceQuery}`, {
        status: 'read',
      });

      let wasUnread = false;
      const readAt = new Date().toISOString();

      setItems(previousItems =>
        previousItems.map(item => {
          if (item.id !== id) {
            return item;
          }
          wasUnread = item.status === 'unread';
          return wasUnread
            ? {
                ...item,
                status: 'read',
                read_at: item.read_at ?? readAt,
              }
            : item;
        })
      );

      setUnreadCount(previousCount => {
        if (!wasUnread) {
          return previousCount;
        }

        const nextCount = Math.max(previousCount - 1, 0);
        dispatchUnreadCountUpdated(namespaceId, nextCount);
        return nextCount;
      });
    },
    [namespaceId, namespaceQuery]
  );

  const clearUnread = useCallback(async () => {
    if (clearingUnread || unreadCount <= 0) {
      return;
    }

    setClearingUnread(true);
    try {
      await http.post(`/notifications/unread/clear${namespaceQuery}`, {});
      await Promise.all([fetchNotifications(1, false), fetchUnreadCount()]);
    } finally {
      setClearingUnread(false);
    }
  }, [
    clearingUnread,
    fetchNotifications,
    fetchUnreadCount,
    namespaceQuery,
    unreadCount,
  ]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => startNotificationPolling(refresh), [refresh]);

  useEffect(() => {
    setUnreadCount(unreadCountCache.get(namespaceId) ?? 0);
  }, [namespaceId]);

  return {
    hasMore,
    items,
    loading,
    loadingMore,
    fetchNotificationDetail,
    loadMore,
    refresh,
    markNotificationRead,
    clearUnread,
    clearingUnread,
    unreadCount,
  };
}

export function useNotificationUnreadCount() {
  const params = useParams();
  const namespaceId = params.namespace_id || '';
  const namespaceQuery = namespaceId
    ? `?${new URLSearchParams({ namespaceId }).toString()}`
    : '';
  const [unreadCount, setUnreadCount] = useState(
    unreadCountCache.get(namespaceId) ?? 0
  );

  // Fetch the latest unread notification count from the server.
  const fetchUnreadCount = useCallback(async () => {
    const response = await http.get<NotificationUnreadCountResponse>(
      `/notifications/unread/count${namespaceQuery}`
    );
    setUnreadCount(response.unread_count);
  }, [namespaceQuery]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  useEffect(
    () => startUnreadCountPolling(fetchUnreadCount),
    [fetchUnreadCount]
  );

  useEffect(() => {
    const handleUnreadCountUpdated = (event: Event) => {
      const customEvent =
        event as CustomEvent<NotificationUnreadCountUpdatedDetail>;
      if ((customEvent.detail?.namespaceId || '') !== namespaceId) {
        return;
      }
      setUnreadCount(customEvent.detail?.count ?? 0);
    };

    window.addEventListener(
      NOTIFICATION_UNREAD_COUNT_UPDATED,
      handleUnreadCountUpdated as EventListener
    );

    return () => {
      window.removeEventListener(
        NOTIFICATION_UNREAD_COUNT_UPDATED,
        handleUnreadCountUpdated as EventListener
      );
    };
  }, [namespaceId]);

  useEffect(() => {
    setUnreadCount(unreadCountCache.get(namespaceId) ?? 0);
  }, [namespaceId]);

  return unreadCount;
}
