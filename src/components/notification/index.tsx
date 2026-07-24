import { type UIEvent, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { useNotifications } from './hooks/useNotifications';
import { NotificationDetailDialog } from './NotificationDetailDialog';
import { NotificationEmptyState } from './NotificationEmptyState';
import { NotificationListItem } from './NotificationListItem';
import { NotificationToolbar } from './NotificationToolbar';
import { SystemNotificationDetailDialog } from './SystemNotificationDetailDialog';
import type {
  NotificationDetail,
  NotificationFilter,
  NotificationItem,
} from './types';
import { mergeNotificationDetail } from './utils';

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
    refreshing,
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

  const labels: Record<NotificationFilter, string> = {
    all: t('notification_modal.all'),
    unread: t('notification_modal.unread'),
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
      const { url } = item?.target || {};
      const source = item?.target?.type;

      if (source === 'link' && url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }

      if (shouldMarkRead) {
        await markNotificationRead(item);
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
            return;
          }
          break;
        default:
          break;
      }

      const notificationDetail = await fetchNotificationDetail(item.id);

      setDetail({
        ...mergeNotificationDetail(notificationDetail, item),
        status:
          shouldMarkRead && notificationDetail.status === 'unread'
            ? 'read'
            : notificationDetail.status,
        readed_at:
          shouldMarkRead && !notificationDetail.readed_at
            ? new Date().toISOString()
            : notificationDetail.readed_at,
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
          refreshing={refreshing}
          onRefresh={refresh}
          onMarkAllRead={clearUnread}
        />

        {items.length > 0 ? (
          <div
            className="-mr-4 flex-1 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#e5e7eb_transparent] hover:[scrollbar-color:#d1d5db_transparent] dark:[scrollbar-color:#4b5563_transparent] dark:hover:[scrollbar-color:#6b7280_transparent]"
            onScroll={handleScroll}
          >
            <div className="space-y-2 pr-4">
              {items.map(item => (
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
                <div className="py-3 text-center text-sm text-muted-foreground">
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

      {detail?.notification_type === 'system' ? (
        <SystemNotificationDetailDialog
          detail={detail}
          open={detailOpen}
          onOpenChange={setDetailOpen}
        />
      ) : (
        <NotificationDetailDialog
          detail={detail}
          open={detailOpen}
          onOpenChange={setDetailOpen}
        />
      )}
    </div>
  );
}

export default Notification;
