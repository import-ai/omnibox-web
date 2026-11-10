import type { TFunction } from 'i18next';

import { readAnswerTiming } from '../core/answerTiming';
import { MessageStatus } from '../core/types/chatResponse';
import type { MessageDetail } from '../core/types/conversation';
import { getLegacyProcessDurationMs, isStoppedMessage } from './messageGroups';

function getCompletedDurationMs(message: MessageDetail) {
  const timing = readAnswerTiming(message.attrs?.answer_timing);
  if (
    timing?.status !== 'complete' ||
    timing.duration_ms === undefined ||
    timing.duration_ms <= 0
  ) {
    return undefined;
  }
  return timing.duration_ms;
}

export function formatAnswerDuration(
  message: MessageDetail,
  t: TFunction,
  processMessages: MessageDetail[] = []
) {
  if (isStoppedMessage(message)) return t('chat.messages.process.stopped');
  if (
    message.status !== MessageStatus.SUCCESS ||
    message.attrs?.answer_timing?.status === 'failed'
  ) {
    return undefined;
  }
  const durationMs =
    getCompletedDurationMs(message) ??
    getLegacyProcessDurationMs(processMessages, message);
  let duration: string;
  if (durationMs === undefined) {
    return undefined;
  } else if (durationMs < 1000) {
    duration = t('chat.messages.process.duration.less_than_second');
  } else {
    const seconds = Math.floor(durationMs / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const restSeconds = seconds % 60;
    const parts: string[] = [];
    if (hours > 0) {
      parts.push(t('chat.messages.process.duration.hours', { count: hours }));
    }
    if (minutes > 0) {
      parts.push(
        t('chat.messages.process.duration.minutes', { count: minutes })
      );
    }
    if (restSeconds > 0) {
      parts.push(
        t('chat.messages.process.duration.seconds', { count: restSeconds })
      );
    }
    duration = parts.join(' ');
  }
  return duration;
}
