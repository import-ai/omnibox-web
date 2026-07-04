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

function isResponseMessage(message: MessageDetail) {
  return (
    message.message.role === OpenAIMessageRole.ASSISTANT ||
    message.message.role === OpenAIMessageRole.TOOL
  );
}

function isFinalAnswer(message: MessageDetail) {
  return (
    message.message.role === OpenAIMessageRole.ASSISTANT &&
    (message.status === MessageStatus.SUCCESS ||
      message.status === MessageStatus.STOPPED) &&
    Boolean(message.message.content?.trim()) &&
    !message.message.tool_calls?.length
  );
}

function getTimestamp(value?: string) {
  const timestamp = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(timestamp) ? undefined : timestamp;
}

function hasPersistedTimestamp(message: MessageDetail) {
  return (
    getTimestamp(message.created_at) !== undefined ||
    getTimestamp(message.updated_at) !== undefined
  );
}

export function getCollapsedProcessDurationSeconds(
  messages: MessageDetail[],
  finalMessage: MessageDetail
) {
  const start = getTimestamp(messages[0]?.created_at);
  const end =
    getTimestamp(finalMessage.updated_at) ??
    getTimestamp(finalMessage.created_at);

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
      (finalMessage.attrs?.response_done || hasPersistedTimestamp(finalMessage))
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
