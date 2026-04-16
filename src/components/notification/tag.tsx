import { BotMessageSquare, MessageCircleWarning } from 'lucide-react';

import type { NotificationItem } from './types';

type NotificationTagIcon = 'assistant' | 'community';

interface NotificationTagProps {
  item: NotificationItem;
  tag: string;
}

const tagClassName =
  'inline-flex max-h-6 items-center gap-1 rounded-sm border border-10 border-border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-muted-foreground dark:border-neutral-500 dark:bg-neutral-900';

const iconMap = {
  assistant: BotMessageSquare,
  community: MessageCircleWarning,
} satisfies Record<NotificationTagIcon, typeof BotMessageSquare>;

export function NotificationTag({ item, tag }: NotificationTagProps) {
  const source = typeof item.attrs.source === 'string' ? item.attrs.source : '';
  const Icon = iconMap[source === 'community' ? 'community' : 'assistant'];

  return (
    <div data-notification-id={item.id} className={tagClassName}>
      <Icon className="size-3.5 shrink-0" />
      <span className="text-xs font-normal text-muted-foreground">{tag}</span>
    </div>
  );
}
