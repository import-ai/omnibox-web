import { BrushCleaning } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

import type { NotificationFilter } from './types';
import { notificationMetaWidthClassName } from './utils';

interface FilterTabsProps {
  value: NotificationFilter;
  unreadCount: number;
  onChange: (filter: NotificationFilter) => void;
  labels: Record<NotificationFilter, string>;
}

interface NotificationToolbarProps {
  unreadCount: number;
  clearingUnread?: boolean;
  filter: NotificationFilter;
  labels: Record<NotificationFilter, string>;
  onMarkAllRead?: () => void;
  onChange: (filter: NotificationFilter) => void;
}

function FilterTabs({ value, unreadCount, onChange, labels }: FilterTabsProps) {
  const filters: Array<{ key: NotificationFilter; label: string }> = [
    { key: 'all', label: labels.all },
    { key: 'unread', label: labels.unread },
    { key: 'read', label: labels.read },
  ];

  return (
    <div className="flex items-center gap-3 [&>button]:cursor-pointer">
      {filters.map(filter => {
        const isActive = value === filter.key;
        return (
          <div
            key={filter.key}
            onClick={() => onChange(filter.key)}
            className={cn(
              'relative h-6 rounded px-2 py-0 text-sm leading-6 text-muted-foreground cursor-pointer transition-colors outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 hover:cursor-pointer',
              isActive
                ? 'bg-blue-50 text-blue-500 dark:bg-blue-500/15 dark:text-blue-300'
                : ' hover:text-foreground'
            )}
          >
            {filter.label}
            {filter.key === 'unread' && unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-medium text-white">
                {unreadCount}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function NotificationToolbar({
  unreadCount,
  clearingUnread = false,
  filter,
  onChange,
  labels,
  onMarkAllRead,
}: NotificationToolbarProps) {
  const { t } = useTranslation();
  const isDisabled = unreadCount === 0 || clearingUnread;

  return (
    <div className="mb-2 flex items-end justify-between pr-2">
      <FilterTabs
        value={filter}
        unreadCount={unreadCount}
        onChange={onChange}
        labels={labels}
      />

      <div
        className={cn(
          notificationMetaWidthClassName,
          'flex shrink-0 items-center justify-end text-sm leading-6 text-muted-foreground'
        )}
      >
        <button
          type="button"
          disabled={isDisabled}
          onClick={onMarkAllRead}
          className={cn(
            'inline-flex items-center gap-1 transition-colors',
            isDisabled
              ? 'cursor-not-allowed text-muted-foreground/50'
              : 'cursor-pointer hover:cursor-pointer hover:text-foreground'
          )}
        >
          <BrushCleaning className="size-4 stroke-2" />
          <span>{t('notification_modal.mark_all_read')}</span>
        </button>
      </div>
    </div>
  );
}
