import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

const MESSAGE_CHANNEL_KEYS = {
  qq: 'chat.messages.user_context.channel.qq',
  wechat: 'chat.messages.user_context.channel.wechat',
  wechat_clawbot: 'chat.messages.user_context.channel.wechat_clawbot',
  telegram: 'chat.messages.user_context.channel.telegram',
} as const;

export function messageChannelLabel(
  channel: string | undefined,
  t: (key: string) => string
): string | null {
  if (!channel) return null;
  const key =
    MESSAGE_CHANNEL_KEYS[channel as keyof typeof MESSAGE_CHANNEL_KEYS];
  return key ? t(key) : channel;
}

export function MessageChannelTime({
  channel,
  time,
  side,
  className,
}: {
  channel?: string;
  time?: string | null;
  side: 'user' | 'assistant';
  className?: string;
}) {
  const { t } = useTranslation();
  const label = messageChannelLabel(channel, t);
  if (!label && !time) return null;

  const channelNode = label ? <span>{label}</span> : null;
  const timeNode = time ? <span>{time}</span> : null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs text-muted-foreground',
        className
      )}
    >
      {side === 'user' ? (
        <>
          {channelNode}
          {timeNode}
        </>
      ) : (
        <>
          {timeNode}
          {channelNode}
        </>
      )}
    </span>
  );
}
