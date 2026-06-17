import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { http } from '@/lib/request';

import type {
  NotificationDetail,
  NotificationDetailDto,
  NotificationFilter,
  NotificationItem,
  NotificationListDto,
  NotificationUnreadCountDto,
} from '../types';
import {
  getNotificationHasMore,
  markNotificationItemsAsRead,
  NOTIFICATION_POLL_INTERVAL_MS,
  startNotificationPolling,
  startResettableNotificationPolling,
} from '../utils';
import { useNotificationUnread } from './useNotificationUnread';

const DEFAULT_LIMIT = 20;

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
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [clearingUnread, setClearingUnread] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const { unreadCount, setUnreadCount } = useNotificationUnread();
  const pollingControllerRef = useRef<ReturnType<
    typeof startResettableNotificationPolling
  > | null>(null);
  const itemsLengthRef = useRef(0);
  const refreshInFlightRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    itemsLengthRef.current = items.length;
  }, [items.length]);

  // get unread count
  const fetchUnreadCount = useCallback(async () => {
    const response = await http.get<NotificationUnreadCountDto>(
      `/notifications/unread/count${namespaceQuery}`
    );
    setUnreadCount(response.unread_count);
  }, [namespaceQuery, setUnreadCount]);

  // get notifications
  const fetchNotifications = useCallback(
    async (
      nextOffset: number,
      append: boolean,
      limit: number = DEFAULT_LIMIT
    ) => {
      const query = new URLSearchParams({
        status: filter,
        offset: nextOffset.toString(),
        limit: limit.toString(),
      });
      if (namespaceId) {
        query.append('namespaceId', namespaceId);
      }
      const response = await http.get<NotificationListDto>(
        `/notifications?${query.toString()}`
      );
      const { list } = response;
      setItems(previousItems => {
        if (append) {
          return [...previousItems, ...list];
        }

        return JSON.stringify(previousItems) === JSON.stringify(list)
          ? previousItems
          : list;
      });
      setHasMore(getNotificationHasMore(response.pagination));
      setOffset(response.pagination.offset + response.pagination.limit);
    },
    [filter, namespaceId]
  );

  const refresh = useCallback(async () => {
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    const refreshPromise = (async () => {
      const currentItemsLength = itemsLengthRef.current;
      const shouldShowInitialLoading = currentItemsLength === 0;
      const refreshLimit = Math.max(DEFAULT_LIMIT, currentItemsLength);

      if (shouldShowInitialLoading) {
        setLoading(true);
      }
      setRefreshing(true);

      try {
        await Promise.all([
          fetchNotifications(0, false, refreshLimit),
          fetchUnreadCount(),
        ]);
      } finally {
        if (shouldShowInitialLoading) {
          setLoading(false);
        }
        setRefreshing(false);
        refreshInFlightRef.current = null;
      }
    })();

    refreshInFlightRef.current = refreshPromise;
    return refreshPromise;
  }, [fetchNotifications, fetchUnreadCount]);

  const handleManualRefresh = useCallback(async () => {
    await refresh();
    pollingControllerRef.current?.restart();
  }, [refresh]);

  // Load more
  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) {
      return;
    }

    setLoadingMore(true);
    try {
      await fetchNotifications(offset, true);
    } finally {
      setLoadingMore(false);
    }
  }, [fetchNotifications, hasMore, loading, loadingMore, offset]);

  // Fetch detail
  const fetchNotificationDetail = useCallback(
    async (id: string) => {
      return http.get<NotificationDetailDto>(
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
    async (item: NotificationItem) => {
      await http.patch(`/notifications/${item.id}${namespaceQuery}`, {
        status: 'read',
      });

      const readAt = new Date().toISOString();

      setItems(
        previousItems =>
          markNotificationItemsAsRead(previousItems, item.id, readAt).items
      );

      if (item.status === 'unread') {
        setUnreadCount(Math.max(unreadCount - 1, 0));
      }
    },
    [namespaceQuery, setUnreadCount, unreadCount]
  );

  const clearUnread = useCallback(async () => {
    if (clearingUnread || unreadCount <= 0) {
      return;
    }

    setClearingUnread(true);
    try {
      await http.post(`/notifications/unread/clear${namespaceQuery}`, {});
      await Promise.all([fetchNotifications(0, false), fetchUnreadCount()]);
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

  useEffect(() => {
    pollingControllerRef.current = startResettableNotificationPolling(
      refresh,
      NOTIFICATION_POLL_INTERVAL_MS
    );

    return () => {
      pollingControllerRef.current?.stop();
      pollingControllerRef.current = null;
    };
  }, [refresh]);

  return {
    hasMore,
    items,
    loading,
    refreshing,
    loadingMore,
    fetchNotificationDetail,
    loadMore,
    refresh: handleManualRefresh,
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
  const { unreadCount, setUnreadCount } = useNotificationUnread();

  // Fetch the latest unread notification count from the server.
  const fetchUnreadCount = useCallback(async () => {
    const response = await http.get<NotificationUnreadCountDto>(
      `/notifications/unread/count${namespaceQuery}`
    );
    setUnreadCount(response.unread_count);
  }, [namespaceQuery, setUnreadCount]);

  useEffect(() => {
    setUnreadCount(0);
  }, [namespaceId, setUnreadCount]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  useEffect(
    () => startUnreadCountPolling(fetchUnreadCount),
    [fetchUnreadCount]
  );

  return unreadCount;
}
