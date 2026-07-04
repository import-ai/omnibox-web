import { MessageStatus, OpenAIMessageRole } from '../core/types/chatResponse';
import type { MessageDetail } from '../core/types/conversation';

export type MessageDisplayItem =
  | {
      type: 'message';
      message: MessageDetail;
    }
  | {
      type: 'collapsed_process';
      messages: MessageDetail[];
      finalMessage: MessageDetail;
    };

const responseRoles = new Set<OpenAIMessageRole>([
  OpenAIMessageRole.ASSISTANT,
  OpenAIMessageRole.TOOL,
]);

const finalAnswerStatuses = new Set<MessageStatus>([
  MessageStatus.SUCCESS,
  MessageStatus.STOPPED,
]);

type TimestampKey =
  | 'created_at'
  | 'updated_at'
  | 'sent_at'
  | 'send_at'
  | 'createdAt'
  | 'updatedAt'
  | 'sentAt'
  | 'sendAt';

type MessageWithTimestamps = MessageDetail &
  Partial<Record<TimestampKey, string>>;

function isResponseMessage(message: MessageDetail) {
  return responseRoles.has(message.message.role);
}

function isFinalAnswer(message: MessageDetail) {
  return (
    message.message.role === OpenAIMessageRole.ASSISTANT &&
    finalAnswerStatuses.has(message.status) &&
    Boolean(message.message.content?.trim()) &&
    !message.message.tool_calls?.length
  );
}

function getTimestamp(message: MessageDetail, keys: TimestampKey[]) {
  const source = message as MessageWithTimestamps;
  for (const key of keys) {
    const value = source[key];
    if (!value) continue;
    const timestamp = new Date(value).getTime();
    if (!Number.isNaN(timestamp)) return timestamp;
  }
}

function hasPersistedTimestamp(message: MessageDetail) {
  return (
    getTimestamp(message, [
      'created_at',
      'updated_at',
      'sent_at',
      'send_at',
      'createdAt',
      'updatedAt',
      'sentAt',
      'sendAt',
    ]) !== undefined
  );
}

function isStableFinalAnswer(message: MessageDetail) {
  return (
    Boolean(message.attrs?.response_done) || hasPersistedTimestamp(message)
  );
}

export function getCollapsedProcessDurationSeconds(
  messages: MessageDetail[],
  finalMessage: MessageDetail
) {
  const start = getTimestamp(messages[0], [
    'created_at',
    'sent_at',
    'send_at',
    'createdAt',
    'sentAt',
    'sendAt',
  ]);
  const end = getTimestamp(finalMessage, [
    'updated_at',
    'sent_at',
    'send_at',
    'updatedAt',
    'sentAt',
    'sendAt',
    'created_at',
    'createdAt',
  ]);

  if (start === undefined || end === undefined || end < start) {
    return undefined;
  }
  return Math.floor((end - start) / 1000);
}

export function buildMessageDisplayItems(
  messages: MessageDetail[]
): MessageDisplayItem[] {
  const result: MessageDisplayItem[] = [];
  let index = 0;

  while (index < messages.length) {
    const message = messages[index];
    if (!isResponseMessage(message)) {
      result.push({ type: 'message', message });
      index += 1;
      continue;
    }

    const start = index;
    while (index < messages.length && isResponseMessage(messages[index])) {
      index += 1;
    }

    const responseMessages = messages.slice(start, index);
    const finalMessage = responseMessages[responseMessages.length - 1];
    if (
      responseMessages.length > 1 &&
      isFinalAnswer(finalMessage) &&
      isStableFinalAnswer(finalMessage)
    ) {
      result.push({
        type: 'collapsed_process',
        messages: responseMessages.slice(0, -1),
        finalMessage,
      });
      result.push({ type: 'message', message: finalMessage });
      continue;
    }

    for (const responseMessage of responseMessages) {
      result.push({ type: 'message', message: responseMessage });
    }
  }

  return result;
}
