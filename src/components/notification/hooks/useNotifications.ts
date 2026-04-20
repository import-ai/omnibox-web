import { useCallback, useEffect, useState } from 'react';
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [clearingUnread, setClearingUnread] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const { unreadCount, setUnreadCount } = useNotificationUnread();

  // get unread count
  const fetchUnreadCount = useCallback(async () => {
    const response = await http.get<NotificationUnreadCountDto>(
      `/notifications/unread/count${namespaceQuery}`
    );
    setUnreadCount(response.unread_count);
  }, [namespaceQuery, setUnreadCount]);

  // get notifications
  const fetchNotifications = useCallback(
    async (nextOffset: number, append: boolean) => {
      const query = new URLSearchParams({
        status: filter,
        offset: nextOffset.toString(),
        limit: DEFAULT_LIMIT.toString(),
      });
      if (namespaceId) {
        query.append('namespaceId', namespaceId);
      }
      const response = await http.get<NotificationListDto>(
        `/notifications?${query.toString()}`
      );
      const { list } = response;
      setItems(previousItems => (append ? [...previousItems, ...list] : list));
      setHasMore(getNotificationHasMore(response.pagination));
      setOffset(response.pagination.offset + response.pagination.limit);
    },
    [filter, namespaceId]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchNotifications(0, false), fetchUnreadCount()]);
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

  useEffect(() => startNotificationPolling(refresh), [refresh]);

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
