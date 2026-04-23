import { BrushCleaning, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

import type { NotificationFilter } from './types';

interface FilterTabsProps {
  value: NotificationFilter;
  unreadCount: number;
  onChange: (filter: NotificationFilter) => void;
  labels: Record<NotificationFilter, string>;
}

interface NotificationToolbarProps {
  unreadCount: number;
  clearingUnread?: boolean;
  refreshing?: boolean;
  filter: NotificationFilter;
  labels: Record<NotificationFilter, string>;
  onMarkAllRead?: () => void;
  onRefresh?: () => void;
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
              'relative h-6 cursor-pointer rounded px-2 py-0 text-sm leading-6 text-muted-foreground outline-none transition-colors hover:cursor-pointer focus:outline-none focus-visible:outline-none focus-visible:ring-0',
              isActive
                ? 'bg-blue-50 text-blue-500 dark:bg-blue-500/15 dark:text-blue-300'
                : 'hover:bg-neutral-100 hover:text-foreground/75 dark:hover:bg-neutral-800'
            )}
          >
            {filter.label}
            {filter.key === 'unread' && unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1.5 inline-flex size-4 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-medium text-white">
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
  refreshing = false,
  filter,
  onChange,
  labels,
  onMarkAllRead,
  onRefresh,
}: NotificationToolbarProps) {
  const { t } = useTranslation();
  const isMarkAllReadDisabled = unreadCount === 0 || clearingUnread;
  const isRefreshDisabled = refreshing;
  const getActionClassName = (disabled: boolean) =>
    cn(
      'inline-flex items-center gap-1 transition-colors',
      disabled
        ? 'cursor-not-allowed text-muted-foreground/50'
        : 'cursor-pointer hover:cursor-pointer hover:text-foreground'
    );

  return (
    <div className="mb-2 flex items-end justify-between pr-2">
      <FilterTabs
        value={filter}
        unreadCount={unreadCount}
        onChange={onChange}
        labels={labels}
      />

      <div className="flex min-w-max shrink-0 items-center justify-end gap-3 text-sm leading-6 text-muted-foreground">
        <button
          type="button"
          disabled={isMarkAllReadDisabled}
          onClick={onMarkAllRead}
          className={getActionClassName(isMarkAllReadDisabled)}
        >
          <BrushCleaning className="size-4 stroke-2" />
          <span>{t('notification_modal.mark_all_read')}</span>
        </button>

        <button
          type="button"
          disabled={isRefreshDisabled}
          onClick={onRefresh}
          className={getActionClassName(isRefreshDisabled)}
        >
          <RefreshCw
            className={cn('size-4 stroke-2', refreshing && 'animate-spin')}
          />
          <span>{t('notification_modal.refresh')}</span>
        </button>
      </div>
    </div>
  );
}
