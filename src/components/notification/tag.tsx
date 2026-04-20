import { Bell, BotMessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { NotificationItem } from './types';

type NotificationTagIcon = 'assistant' | 'default';

interface NotificationTagProps {
  item: NotificationItem;
  tag: string;
}

const tagClassName =
  'inline-flex max-h-6 items-center gap-1 rounded-sm border border-10 border-border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-muted-foreground dark:border-neutral-500 dark:bg-neutral-900';

const iconMap = {
  assistant: BotMessageSquare,
  default: Bell,
} satisfies Record<NotificationTagIcon, typeof BotMessageSquare>;

const notificationTagLabelKeyMap = {
  wechat_bot: 'notification_modal.tags.wechat_bot',
  community: 'notification_modal.tags.community',
} as const;

export function getNotificationTagLabel(
  tag: string,
  translate: (key: string) => string
) {
  const labelKey =
    notificationTagLabelKeyMap[tag as keyof typeof notificationTagLabelKeyMap];

  return labelKey ? translate(labelKey) : tag;
}

export function getNotificationTagIconKey(
  item: NotificationItem
): NotificationTagIcon {
  const source = typeof item.attrs.source === 'string' ? item.attrs.source : '';

  if (!source) {
    return 'default';
  }

  return ['assistant', 'wechat_bot', 'qq_bot'].includes(source)
    ? 'assistant'
    : 'default';
}

export function NotificationTag({ item, tag }: NotificationTagProps) {
  const { t } = useTranslation();
  const Icon = iconMap[getNotificationTagIconKey(item)];
  const label = getNotificationTagLabel(tag, t);

  return (
    <div data-notification-id={item.id} className={tagClassName}>
      <Icon className="size-3.5 shrink-0" />
      <span className="text-xs font-normal text-muted-foreground">{label}</span>
    </div>
  );
}
