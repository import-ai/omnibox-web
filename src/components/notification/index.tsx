import { type UIEvent, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { NotificationDetailDialog } from './detail-dialog';
import { NotificationEmptyState } from './empty-state';
import { useNotifications } from './hooks/useNotifications';
import { NotificationListItem } from './item';
import { NotificationToolbar } from './toolbar';
import type {
  NotificationDetail,
  NotificationFilter,
  NotificationItem,
} from './types';
import { filterUnexpiredNotifications } from './utils';

function Notification({ onClose }: { onClose?: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams();
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [detail, setDetail] = useState<NotificationDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const namespaceId = params.namespace_id || '';
  const {
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
    hasMore,
  } = useNotifications(filter);
  const visibleItems = filterUnexpiredNotifications(items);

  const labels: Record<NotificationFilter, string> = {
    all: t('notification_modal.all'),
    unread: t('notification_modal.unread'),
    read: t('notification_modal.read'),
  };

  const emptyLabel = t('notification_modal.empty');

  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const target = event.currentTarget;
      const distanceToBottom =
        target.scrollHeight - target.scrollTop - target.clientHeight;

      if (distanceToBottom <= 40) {
        loadMore();
      }
    },
    [loadMore]
  );

  // Handle notification click behavior based on the configured action type.
  const handleOpenDetail = useCallback(
    async (item: NotificationItem) => {
      const shouldMarkRead = item.status === 'unread';
      const { url, target } = item?.target || {};
      const source = item?.target?.type;

      if (shouldMarkRead) {
        await markNotificationRead(item.id);
      }

      switch (source) {
        case 'resource': {
          const resourceId = item.target?.resource_id;

          if (namespaceId && resourceId) {
            onClose?.();
            navigate(`/${namespaceId}/${resourceId}`);
          }

          return;
        }
        case 'link':
          if (url) {
            window.open(url, target);
            return;
          }
          break;
        default:
          break;
      }

      const notificationDetail = await fetchNotificationDetail(item.id);

      setDetail({
        ...notificationDetail,
        status:
          shouldMarkRead && notificationDetail.status === 'unread'
            ? 'read'
            : notificationDetail.status,
        read_at:
          shouldMarkRead && !notificationDetail.read_at
            ? new Date().toISOString()
            : notificationDetail.read_at,
      });
      setDetailOpen(true);
    },
    [
      fetchNotificationDetail,
      markNotificationRead,
      namespaceId,
      navigate,
      onClose,
    ]
  );

  return (
    <div className="mt-2 flex h-full min-h-0 w-full flex-col bg-white dark:bg-neutral-900">
      <div className="flex h-full min-h-0 flex-col">
        <NotificationToolbar
          unreadCount={unreadCount}
          clearingUnread={clearingUnread}
          filter={filter}
          onChange={setFilter}
          labels={labels}
          refreshing={loading}
          onRefresh={refresh}
          onMarkAllRead={clearUnread}
        />

        {visibleItems.length > 0 ? (
          <div className="flex-1 overflow-y-auto" onScroll={handleScroll}>
            <div className="space-y-2">
              {visibleItems.map(item => (
                <NotificationListItem
                  key={item.id}
                  item={item}
                  onClick={handleOpenDetail}
                />
              ))}
              {loadingMore ? (
                <div className="py-3 text-center text-sm text-muted-foreground">
                  {t('notification_modal.loading_more')}
                </div>
              ) : null}
              {!loading && !loadingMore && !hasMore ? (
                <div className="py-3 text-center text-sm text-neutral-300">
                  {t('notification_modal.no_more')}
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mt-2 flex-1 pr-4">
            {loading ? null : <NotificationEmptyState label={emptyLabel} />}
          </div>
        )}
      </div>

      <NotificationDetailDialog
        detail={detail}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}

export default Notification;
