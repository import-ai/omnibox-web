import {
  Bell,
  BotMessageSquare,
  CircleHelp,
  Megaphone,
  Package,
  ScrollText,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { NotificationItem } from './types';

type NotificationTagIcon =
  'assistant' | 'default' | 'system' | 'marketing' | 'changelog' | 'survey';

interface NotificationTagProps {
  item: NotificationItem;
  tag: string;
}

interface NotificationTagIconProps {
  item: Pick<NotificationItem, 'attrs'>;
  tag: string;
  className?: string;
}

const tagClassName =
  'inline-flex max-h-6 items-center gap-1 rounded-sm border border-10 border-border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-muted-foreground dark:border-neutral-500 dark:bg-neutral-900';

const iconMap = {
  assistant: BotMessageSquare,
  default: Bell,
  system: Package,
  marketing: Megaphone,
  changelog: ScrollText,
  survey: CircleHelp,
} satisfies Record<NotificationTagIcon, typeof BotMessageSquare>;

const notificationTagIconKeyMap = {
  system: 'system',
  marketing: 'marketing',
  changelog: 'changelog',
  survey: 'survey',
} as const satisfies Record<string, NotificationTagIcon>;

const notificationTagLabelKeyMap = {
  wechat_bot: 'notification_modal.tags.wechat_bot',
  community: 'notification_modal.tags.community',
  system: 'notification_modal.tags.system',
  marketing: 'notification_modal.tags.marketing',
  changelog: 'notification_modal.tags.changelog',
  survey: 'notification_modal.tags.survey',
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
  item: Pick<NotificationItem, 'attrs'>,
  tag: string
): NotificationTagIcon {
  const tagIconKey =
    notificationTagIconKeyMap[tag as keyof typeof notificationTagIconKeyMap];

  if (tagIconKey) {
    return tagIconKey;
  }

  const source = typeof item.attrs.source === 'string' ? item.attrs.source : '';

  if (!source) {
    return 'default';
  }

  return ['assistant', 'wechat_bot', 'qq_bot'].includes(source)
    ? 'assistant'
    : 'default';
}

export function NotificationTagIcon({
  item,
  tag,
  className = 'size-3.5 shrink-0',
}: NotificationTagIconProps) {
  const Icon = iconMap[getNotificationTagIconKey(item, tag)];

  return <Icon className={className} />;
}

export function NotificationTag({ item, tag }: NotificationTagProps) {
  const { t } = useTranslation();
  const label = getNotificationTagLabel(tag, t);

  return (
    <div data-notification-id={item.id} className={tagClassName}>
      <NotificationTagIcon item={item} tag={tag} />
      <span className="text-xs font-normal text-muted-foreground">{label}</span>
    </div>
  );
}
