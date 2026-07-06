/** Groups chat messages for final-answer collapse and message index rendering. */
import { MessageStatus, OpenAIMessageRole } from '../core/types/chatResponse';
import type { MessageDetail } from '../core/types/conversation';

type MessageDisplayItem =
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

function isToolDecisionMessage(message: MessageDetail) {
  return (
    message.message.role === OpenAIMessageRole.USER &&
    (message.attrs?.tool_call?.decisions ?? []).length > 0
  );
}

function isProcessMessage(message: MessageDetail) {
  return isResponseMessage(message) || isToolDecisionMessage(message);
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

function isUserQuery(message: MessageDetail) {
  return (
    message.message.role === OpenAIMessageRole.USER &&
    (message.attrs?.tool_call?.decisions ?? []).length === 0 &&
    Boolean(message.message.content?.trim())
  );
}

function getTimestamp(value?: string) {
  const timestamp = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(timestamp) ? undefined : timestamp;
}

export function getCollapsedProcessDurationSeconds(
  messages: MessageDetail[],
  finalMessage: MessageDetail
) {
  const start = messages
    .map(message => getTimestamp(message.created_at))
    .find(timestamp => timestamp !== undefined);
  const end = getTimestamp(finalMessage.created_at);

  if (start === undefined || end === undefined || end < start) {
    return 0;
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
    if (!isProcessMessage(message)) {
      result.push({ type: 'message', message });
      index += 1;
      continue;
    }

    const start = index;
    while (index < messages.length && isProcessMessage(messages[index])) {
      index += 1;
    }

    const responseMessages = messages.slice(start, index);
    const finalMessage = responseMessages[responseMessages.length - 1];
    if (responseMessages.length > 1 && isFinalAnswer(finalMessage)) {
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

export function buildMessageIndexItems(messages: MessageDetail[]) {
  const result = [];
  let queryMessage: MessageDetail | undefined;
  let answerMessage: MessageDetail | undefined;

  function flush() {
    const query = queryMessage?.message.content?.trim();
    const answer = answerMessage?.message.content?.trim();
    if (queryMessage && answerMessage && query && answer) {
      result.push({
        id: queryMessage.id,
        targetMessageId: queryMessage.id,
        answerMessageId: answerMessage.id,
        query,
        answer,
      });
    }
  }

  for (const message of messages) {
    if (isUserQuery(message)) {
      flush();
      queryMessage = message;
      answerMessage = undefined;
    } else if (queryMessage && isFinalAnswer(message)) {
      answerMessage = message;
    }
  }
  flush();

  return result;
}
