import {
  MessageStatus,
  OpenAIMessageRole,
} from '@/page/chat/core/types/chatResponse';

import type { MessageDetail } from '../core/types/conversation';
import { ToolCallStatus } from '../core/types/toolCall';
import {
  findToolMessageForToolCall,
  isTerminalToolCallStatus,
  isToolTurnStopped,
  resolveToolCallStatus,
} from './role/assistantMessageUtils';

export type DecisionTurnState =
  'sending' | 'executing' | 'completed' | 'failed' | 'unknown' | 'stopped';

export interface DecisionTurn {
  state: DecisionTurnState;
  hasApprove: boolean;
  // A rejected tool result: the completed copy stays neutral when a live
  // reject replaced an earlier approve under the same decision message.
  hasRejectedResult: boolean;
  // The resume produced no result and only failed empty replies, the same
  // evidence the backend accepts for sending the decision again.
  canRetry: boolean;
}

export function hasDecisions(message: MessageDetail | undefined): boolean {
  return Boolean(message?.attrs?.tool_call?.decisions?.length);
}

export function findDecisionForAssistant(
  assistant: MessageDetail | undefined,
  messages: MessageDetail[]
): MessageDetail | undefined {
  if (!assistant) return undefined;
  return messages.find(
    message =>
      message.parent_id === assistant.id &&
      message.message.role === OpenAIMessageRole.USER &&
      hasDecisions(message)
  );
}

function parseArguments(raw: string | undefined): unknown {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

// Interrupt arguments and tool-call arguments are serialized independently and
// a JSONB round trip reorders object keys, so order-sensitive comparisons (raw
// JSON.stringify or the display join) miss matches after a reload.
function sameJsonValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length)
      return false;
    return a.every((item, index) => sameJsonValue(item, b[index]));
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const aRecord = a as Record<string, unknown>;
    const bRecord = b as Record<string, unknown>;
    const aKeys = Object.keys(aRecord);
    const bKeys = Object.keys(bRecord);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every(
      key =>
        Object.prototype.hasOwnProperty.call(bRecord, key) &&
        sameJsonValue(aRecord[key], bRecord[key])
    );
  }
  return false;
}

/** Matches a tool call's serialized arguments to an interrupt's arguments. */
export function toolCallArgumentsMatch(
  rawArguments: string | undefined,
  interruptArgs: unknown
): boolean {
  const args = parseArguments(rawArguments);
  return args !== undefined && sameJsonValue(args, interruptArgs);
}

// Resolves the tool calls an assistant left waiting for approval, by matching
// each interrupt to its call by name and parsed arguments. Undefined when the
// assistant is absent or a call cannot be matched, so callers fall back to the
// interrupt name/arguments match.
export function interruptedToolCallIds(
  assistant: MessageDetail | undefined
): string[] | undefined {
  const interrupts = assistant?.attrs?.tool_call?.interrupts ?? [];
  const toolCalls = assistant?.message.tool_calls ?? [];
  if (!assistant || interrupts.length === 0) return undefined;
  const used = new Set<string>();
  const ids: string[] = [];
  for (const interrupt of interrupts) {
    const call = toolCalls.find(toolCall => {
      if (used.has(toolCall.id) || toolCall.function.name !== interrupt.name)
        return false;
      return toolCallArgumentsMatch(
        toolCall.function.arguments,
        interrupt.args
      );
    });
    if (!call) return undefined;
    used.add(call.id);
    ids.push(call.id);
  }
  return ids;
}

function hasContent(message: MessageDetail): boolean {
  const content = message.message.content;
  return Boolean(typeof content === 'string' ? content.trim() : content);
}

function isFailedEmptyReply(message: MessageDetail): boolean {
  return (
    message.message.role === OpenAIMessageRole.ASSISTANT &&
    message.status === MessageStatus.FAILED &&
    !hasContent(message) &&
    !message.message.tool_calls?.length &&
    !message.attrs?.tool_call?.interrupts?.length
  );
}

function hasTurnError(message: MessageDetail | undefined): boolean {
  return Boolean(message?.attrs?.error_message || message?.attrs?.error_code);
}

// The messages the decision turn added: everything after the decision up to
// the next question or the next assistant that waits for approval.
function decisionSegment(
  decision: MessageDetail,
  messages: MessageDetail[]
): MessageDetail[] {
  const index = messages.findIndex(message => message.id === decision.id);
  if (index < 0) return [];
  const segment: MessageDetail[] = [];
  for (let cursor = index + 1; cursor < messages.length; cursor++) {
    const message = messages[cursor];
    if (
      message.message.role === OpenAIMessageRole.USER &&
      !hasDecisions(message)
    )
      break;
    if (
      message.message.role === OpenAIMessageRole.ASSISTANT &&
      (message.attrs?.tool_call?.interrupts?.length ?? 0) > 0
    )
      break;
    segment.push(message);
  }
  return segment;
}

export function resolveDecisionTurn(
  decision: MessageDetail,
  messages: MessageDetail[]
): DecisionTurn {
  const decisions = decision.attrs?.tool_call?.decisions ?? [];
  const hasApprove = decisions.some(item => item.type === 'approve');
  const empty = { hasApprove, hasRejectedResult: false, canRetry: false };

  if (
    decision.status === MessageStatus.PENDING ||
    decision.status === MessageStatus.STREAMING
  )
    return { state: 'sending', ...empty };
  if (decision.status === MessageStatus.FAILED)
    return { state: 'failed', ...empty };

  const segment = decisionSegment(decision, messages);
  const segmentTools = segment.filter(
    message => message.message.role === OpenAIMessageRole.TOOL
  );
  const parent = messages.find(message => message.id === decision.parent_id);
  const ids = interruptedToolCallIds(parent);
  const exact = ids
    ? ids.map(id => findToolMessageForToolCall(messages, id))
    : [];
  const exactKnown = exact.some(Boolean);
  const results = exactKnown ? exact : segmentTools;
  const definedResults = results.filter((message): message is MessageDetail =>
    Boolean(message)
  );
  const statuses = definedResults.map(message =>
    resolveToolCallStatus(message)
  );
  const hasRejectedResult = definedResults.some(
    message => message.attrs?.tool_call?.status === ToolCallStatus.REJECTED
  );
  const turn = { hasApprove, hasRejectedResult };
  // A settled turn is one whose model reply completed; a failed or stopped
  // reply is handled by the rules below.
  const settledAssistant = segment.some(
    message =>
      message.message.role === OpenAIMessageRole.ASSISTANT &&
      message.status === MessageStatus.SUCCESS
  );
  const allResultsTerminal = definedResults.every(message =>
    isTerminalToolCallStatus(resolveToolCallStatus(message))
  );

  if (
    statuses.includes(ToolCallStatus.STOPPED) ||
    isToolTurnStopped(messages, parent?.id ?? decision.id) ||
    decision.status === MessageStatus.STOPPED ||
    (definedResults.length === 0 &&
      Boolean(decision.attrs?.stopped_runs?.length))
  )
    return { state: 'stopped', ...turn, canRetry: false };

  if (definedResults.some(hasTurnError))
    return { state: 'unknown', ...turn, canRetry: false };

  if (
    definedResults.some(
      message => message.attrs?.tool_call?.status === ToolCallStatus.FAILED
    )
  )
    return { state: 'failed', ...turn, canRetry: false };

  let completed = false;
  if (exactKnown) {
    completed =
      ids?.every(id => {
        const result = findToolMessageForToolCall(messages, id);
        return (
          Boolean(result) &&
          isTerminalToolCallStatus(resolveToolCallStatus(result))
        );
      }) ||
      (settledAssistant && allResultsTerminal);
  } else if (ids) {
    // The interrupted assistant is not in the loaded page; only the turn's
    // own messages can settle it.
    completed = settledAssistant && allResultsTerminal;
  } else {
    completed =
      (segmentTools.length > 0 && allResultsTerminal) || settledAssistant;
  }
  if (completed) return { state: 'completed', ...turn, canRetry: false };

  if (statuses.some(status => !isTerminalToolCallStatus(status)))
    return { state: 'executing', ...turn, canRetry: false };

  if (definedResults.length === 0) {
    if (
      segment.some(
        message =>
          message.message.role === OpenAIMessageRole.ASSISTANT &&
          message.status === MessageStatus.FAILED
      )
    ) {
      const canRetry =
        segmentTools.length === 0 && segment.every(isFailedEmptyReply);
      return { state: 'failed', ...turn, canRetry };
    }
    if (settledAssistant)
      return { state: 'completed', ...turn, canRetry: false };
  }
  return { state: 'executing', ...turn, canRetry: false };
}

// Row status for a tool call an assistant left waiting. The caller keeps a
// terminal result's status and turns a result with the turn's error marker
// into UNKNOWN before calling this.
export function interruptedToolCallDisplayStatus(
  decision: MessageDetail | undefined,
  messages: MessageDetail[],
  busy: boolean
): ToolCallStatus {
  if (!decision || decision.status === MessageStatus.FAILED)
    return ToolCallStatus.INTERRUPTED;
  if (busy) return ToolCallStatus.RUNNING;
  switch (resolveDecisionTurn(decision, messages).state) {
    case 'stopped':
      return ToolCallStatus.STOPPED;
    case 'failed':
      return ToolCallStatus.FAILED;
    case 'unknown':
      return ToolCallStatus.UNKNOWN;
    default:
      return ToolCallStatus.RUNNING;
  }
}
