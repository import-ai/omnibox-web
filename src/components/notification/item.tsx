import { formatDistanceToNow } from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

import { NotificationTag } from './tag';
import type { NotificationItem } from './types';
import {
  notificationMetaColumnClassName,
  notificationMetaWidthClassName,
} from './utils';

interface NotificationListItemProps {
  item: NotificationItem;
  onClick?: (item: NotificationItem) => void;
}
export function NotificationListItem({
  item,
  onClick,
}: NotificationListItemProps) {
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith('zh-') ? zhCN : enUS;
  return (
    <div
      data-notification-item="true"
      className="w-full rounded-lg bg-white px-2 py-3 cursor-pointer transition-colors duration-200 hover:cursor-pointer hover:bg-neutral-100 active:cursor-pointer active:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:active:bg-neutral-700 [&_*]:cursor-pointer"
      onClick={() => onClick?.(item)}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_112px] items-start gap-x-2 sm:grid-cols-[minmax(0,1fr)_140px] sm:gap-x-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start">
            <div
              className={cn(
                'w-full truncate text-base leading-6 text-card-foreground',
                item.status === 'unread' ? 'font-semibold' : 'font-medium'
              )}
            >
              {item.title}
            </div>
          </div>
          <p className="w-full truncate text-sm font-normal leading-5 text-muted-foreground sm:max-w-[446px]">
            {item.summary}
          </p>
        </div>

        <div
          className={cn(
            notificationMetaWidthClassName,
            notificationMetaColumnClassName
          )}
        >
          {item.tags.length > 0 ? (
            <div className="flex max-w-full flex-wrap items-center justify-end gap-2 overflow-hidden">
              {item.tags.map(tag => {
                return (
                  <NotificationTag key={`${item.id}`} item={item} tag={tag} />
                );
              })}
            </div>
          ) : null}
          <div className="flex max-w-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <span className="truncate text-xs text-muted-foreground">
              {formatDistanceToNow(item.created_at, {
                locale,
                addSuffix: false,
              })}
            </span>
            {item.status === 'unread' ? (
              <span className="size-2 rounded-full bg-red-500" />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
