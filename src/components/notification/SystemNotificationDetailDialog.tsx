import { format } from 'date-fns';
import { Bookmark, ChevronLeft, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Markdown } from '@/components/markdown';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';

import { getNotificationTagLabel } from './NotificationTag';
import type { NotificationDetail } from './types';
import { notificationDialogContentClassName } from './utils';

const MAX_VISIBLE_TAGS = 3;

interface SystemNotificationDetailDialogProps {
  detail: NotificationDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SystemNotificationDetailDialog({
  detail,
  open,
  onOpenChange,
}: SystemNotificationDetailDialogProps) {
  const { t } = useTranslation();
  const visibleTags = detail?.tags.slice(0, MAX_VISIBLE_TAGS) ?? [];
  const hiddenTagCount = Math.max(
    (detail?.tags.length ?? 0) - MAX_VISIBLE_TAGS,
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={notificationDialogContentClassName}>
        <DialogHeader className="border-b border-neutral-200 pb-4 pr-8 text-left dark:border-neutral-800">
          <div className="flex min-w-0 items-center gap-3">
            <DialogClose asChild>
              <button
                type="button"
                aria-label={t('notification_modal.back')}
                className="shrink-0 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronLeft className="size-6" />
              </button>
            </DialogClose>
            <DialogTitle className="truncate text-left text-2xl font-semibold leading-8 text-neutral-950 dark:text-neutral-50">
              {detail?.title}
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto pt-4 pr-1">
          {detail ? (
            <>
              <div className="mb-5 space-y-3 text-sm text-muted-foreground">
                <div className="flex min-w-0 items-center gap-3">
                  <Bookmark className="size-4 shrink-0" />
                  <span className="shrink-0">
                    {t('notification_modal.notification_type')}
                  </span>
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    {visibleTags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex max-w-40 items-center truncate rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
                      >
                        {getNotificationTagLabel(tag, t)}
                      </span>
                    ))}
                    {hiddenTagCount > 0 ? (
                      <span className="inline-flex items-center rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
                        +{hiddenTagCount}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="size-4 shrink-0" />
                  <span>{t('notification_modal.created_at')}</span>
                  <time dateTime={detail.created_at}>
                    {format(new Date(detail.created_at), 'yyyy-MM-dd HH:mm:ss')}
                  </time>
                </div>
              </div>
              <Markdown content={detail.content} />
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
