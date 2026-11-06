import type { TFunction } from 'i18next';

import { OpenAIMessageRole } from '../core/types/chatResponse';
import type { MessageDetail } from '../core/types/conversation';

/** Use only a finalized server snapshot, including for history and mobile-origin answers. */
export function getAnswerTiming(message: MessageDetail) {
  const timing = message.attrs?.answer_timing;
  if (
    ![OpenAIMessageRole.ASSISTANT, OpenAIMessageRole.TOOL].includes(
      message.message.role
    ) ||
    timing?.version !== 1 ||
    !['success', 'failed', 'stopped'].includes(timing.outcome) ||
    !(
      timing.outcome === message.status ||
      (timing.outcome === 'stopped' && message.attrs?.turn_status === 'stopped')
    ) ||
    typeof timing.duration_ms !== 'number' ||
    !Number.isSafeInteger(timing.duration_ms) ||
    timing.duration_ms <= 0
  )
    return undefined;
  return timing;
}

export function formatAnswerDuration(durationMs: number, t: TFunction) {
  if (durationMs < 1000)
    return t('chat.messages.answer_duration.less_than_second');
  const seconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const restSeconds = seconds % 60;
  const parts: string[] = [];
  if (hours > 0)
    parts.push(t('chat.messages.process.duration.hours', { count: hours }));
  if (minutes > 0)
    parts.push(t('chat.messages.process.duration.minutes', { count: minutes }));
  if (restSeconds > 0)
    parts.push(
      t('chat.messages.process.duration.seconds', { count: restSeconds })
    );
  return parts.join(' ');
}
