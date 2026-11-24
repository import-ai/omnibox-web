import { hasToolCalls } from '../conversation/conversationHistory';
import { readAnswerTiming } from '../core/answerTiming';
/** Groups chat messages for final-answer collapse and message index rendering. */
import { MessageStatus, OpenAIMessageRole } from '../core/types/chatResponse';
import type { MessageDetail } from '../core/types/conversation';

type MessageDisplayItem =
  | {
      type: 'message';
      message: MessageDetail;
      /** Pro turns render only the answer, without its reasoning or tool UI. */
      suppressProcessUi?: boolean;
    }
  | {
      type: 'collapsed_process';
      messages: MessageDetail[];
      finalMessage: MessageDetail;
      /** The turn still produces output, so the summary reports progress. */
      running: boolean;
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

export function isStoppedMessage(message: MessageDetail) {
  return (
    message.status === MessageStatus.STOPPED ||
    message.attrs?.turn_status === 'stopped' ||
    readAnswerTiming(message.attrs?.answer_timing)?.status === 'stopped'
  );
}

function isFinalAnswer(message: MessageDetail) {
  return (
    message.message.role === OpenAIMessageRole.ASSISTANT &&
    (isStoppedMessage(message) ||
      (message.status === MessageStatus.SUCCESS &&
        Boolean(message.message.content?.trim()))) &&
    !hasToolCalls(message)
  );
}

/** A user message without decisions opens a turn, even when it only holds images. */
function startsTurn(message: MessageDetail) {
  return (
    message.message.role === OpenAIMessageRole.USER &&
    (message.attrs?.tool_call?.decisions ?? []).length === 0
  );
}

function isUserQuery(message: MessageDetail) {
  return startsTurn(message) && Boolean(message.message.content?.trim());
}

/**
 * Agent 2.1 (`pro`) turns keep reasoning and tool traffic out of the reply area.
 * Agent 1.1 (`basic`) turns and records without `edition` keep the legacy layout.
 */
function isProTurn(message: MessageDetail) {
  return message.attrs?.edition === 'pro';
}

function isRunningMessage(message: MessageDetail) {
  return (
    message.status === MessageStatus.PENDING ||
    message.status === MessageStatus.STREAMING
  );
}

/** Wizard marks the tools-disabled answer call before its first delta. */
function isAnswerPhase(message: MessageDetail) {
  return (
    message.message.role === OpenAIMessageRole.ASSISTANT &&
    message.attrs?.answer_phase === 'answer'
  );
}

/** Phased turns never fall back to known interim text. */
function isPhasedMessage(message: MessageDetail) {
  return message.attrs?.answer_phase !== undefined;
}

function isAnswerCandidate(message: MessageDetail) {
  return (
    message.message.role === OpenAIMessageRole.ASSISTANT &&
    !hasToolCalls(message) &&
    Boolean(message.message.content?.trim())
  );
}

/** Rows that stay visible even inside a pro turn. */
function isPinnedMessage(message: MessageDetail) {
  return (
    Boolean(message.attrs?.compact) ||
    message.status === MessageStatus.FAILED ||
    Boolean(message.attrs?.error_message)
  );
}

function pushLegacyItems(
  messages: MessageDetail[],
  result: MessageDisplayItem[]
) {
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
    const stopped = isStoppedMessage(finalMessage);
    const hasFinalReasoning = Boolean(
      finalMessage.has_reasoning ||
      finalMessage.message.reasoning_content?.trim()
    );
    if (
      (responseMessages.length > 1 || hasFinalReasoning || stopped) &&
      isFinalAnswer(finalMessage)
    ) {
      const processMessages = responseMessages.slice(0, -1);
      let answerMessage = finalMessage;
      if (hasFinalReasoning || (stopped && processMessages.length === 0)) {
        // Project one stored message into process and answer views without changing its identity.
        processMessages.push({
          ...finalMessage,
          message: { ...finalMessage.message, content: undefined },
        });
        answerMessage = {
          ...finalMessage,
          has_reasoning: false,
          message: { ...finalMessage.message, reasoning_content: undefined },
        };
      }
      result.push({
        type: 'collapsed_process',
        messages: processMessages,
        finalMessage,
        running: false,
      });
      if (!stopped || answerMessage.message.content?.trim()) {
        result.push({ type: 'message', message: answerMessage });
      }
      continue;
    }

    for (const responseMessage of responseMessages) {
      result.push({ type: 'message', message: responseMessage });
    }
  }
}

function pushHiddenProcessItems(
  turn: MessageDetail[],
  result: MessageDisplayItem[]
) {
  const turnIsRunning = turn.some(isRunningMessage);
  const markedAnswer = [...turn].reverse().find(isAnswerPhase);
  const answer =
    markedAnswer ??
    (turn.some(isPhasedMessage)
      ? undefined
      : [...turn].reverse().find(isAnswerCandidate));
  const turnRunning = !answer && turnIsRunning;
  const answerHasReasoning = Boolean(
    answer && (answer.has_reasoning || answer.message.reasoning_content?.trim())
  );
  let processMessages: MessageDetail[] = [];

  function flush() {
    if (processMessages.length === 0) return;
    result.push({
      type: 'collapsed_process',
      messages: processMessages,
      finalMessage: answer ?? processMessages[processMessages.length - 1],
      running: turnRunning || processMessages.some(isRunningMessage),
    });
    processMessages = [];
  }

  for (const message of turn) {
    if (message === answer) {
      if (answerHasReasoning) {
        // Project the stored message into process and answer views without changing its identity.
        processMessages.push({
          ...answer,
          message: { ...answer.message, content: undefined },
        });
      }
      flush();
      result.push({ type: 'message', message, suppressProcessUi: true });
      continue;
    }
    if (isPinnedMessage(message)) {
      flush();
      result.push({ type: 'message', message });
      continue;
    }
    if (isProcessMessage(message)) {
      processMessages.push(message);
      continue;
    }
    flush();
    result.push({ type: 'message', message });
  }
  flush();
}

export function buildMessageDisplayItems(
  messages: MessageDetail[]
): MessageDisplayItem[] {
  const result: MessageDisplayItem[] = [];
  let start = 0;

  for (let index = 0; index < messages.length; index += 1) {
    if (index > start && startsTurn(messages[index])) {
      pushTurn(messages.slice(start, index), result);
      start = index;
    }
  }
  pushTurn(messages.slice(start), result);

  return result;
}

function getTurnQuery(turn: MessageDetail[]) {
  const [first] = turn;
  return first && startsTurn(first) ? first : undefined;
}

function pushTurn(turn: MessageDetail[], result: MessageDisplayItem[]) {
  const query = getTurnQuery(turn);
  if (query && isProTurn(query)) {
    pushHiddenProcessItems(turn, result);
    return;
  }
  pushLegacyItems(turn, result);
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

/** Preserve the original multi-message history calculation only for pre-protocol records. */
export function getLegacyProcessDurationMs(
  messages: MessageDetail[],
  finalMessage: MessageDetail
) {
  if (
    finalMessage.status !== MessageStatus.SUCCESS ||
    finalMessage.attrs?.turn_status === 'stopped' ||
    [...messages, finalMessage].some(
      message => message.attrs?.answer_timing != null
    )
  )
    return undefined;
  const start = messages
    .filter(message => message.id !== finalMessage.id)
    .map(message => Date.parse(message.created_at ?? ''))
    .find(timestamp => Number.isFinite(timestamp));
  const end = Date.parse(finalMessage.created_at ?? '');
  if (start === undefined || !Number.isFinite(end)) return undefined;
  const duration = end - start;
  return Number.isSafeInteger(duration) && duration > 0 ? duration : undefined;
}
