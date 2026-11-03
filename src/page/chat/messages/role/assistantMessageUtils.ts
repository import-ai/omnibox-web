import {
  MessageStatus,
  OpenAIMessageRole,
} from '../../core/types/chatResponse';
import type { MessageDetail } from '../../core/types/conversation';
import { ToolCallStatus } from '../../core/types/toolCall';

const terminalToolCallStatuses = new Set<string>([
  ToolCallStatus.SUCCESS,
  ToolCallStatus.FAILED,
  ToolCallStatus.REJECTED,
  ToolCallStatus.STOPPED,
]);

export function isTerminalToolCallStatus(
  status: string
): status is ToolCallStatus {
  return terminalToolCallStatuses.has(status);
}

export function findToolMessageForToolCall(
  messages: MessageDetail[],
  toolCallId: string
) {
  return messages
    .slice()
    .reverse()
    .find(
      m =>
        m.message.role === OpenAIMessageRole.TOOL &&
        m.message.tool_call_id === toolCallId
    );
}

export function isToolTurnStopped(
  messages: MessageDetail[],
  assistantId: string
): boolean {
  const index = messages.findIndex(m => m.id === assistantId);
  if (index < 0) return false;
  let start = index;
  while (
    start > 0 &&
    (messages[start].message.role !== OpenAIMessageRole.USER ||
      messages[start].attrs?.tool_call?.decisions?.length)
  )
    start--;
  let end = index + 1;
  while (
    end < messages.length &&
    (messages[end].message.role !== OpenAIMessageRole.USER ||
      messages[end].attrs?.tool_call?.decisions?.length)
  )
    end++;
  const turn = messages.slice(start, end);
  const runId = turn
    .slice()
    .reverse()
    .find(m => m.attrs?.turn_run_id)?.attrs?.turn_run_id;
  return turn.some(
    m =>
      (m.status === MessageStatus.STOPPED &&
        (!runId || m.attrs?.turn_run_id === runId)) ||
      (m.attrs?.turn_status === 'stopped' &&
        (!runId || (m.attrs.stopped_run_id ?? m.attrs.turn_run_id) === runId))
  );
}

export function resolveToolCallStatus(
  toolMessage?: Pick<MessageDetail, 'attrs' | 'status'>,
  turnStopped = false
): ToolCallStatus {
  const status = toolMessage?.attrs?.tool_call?.status;
  if (status && isTerminalToolCallStatus(status)) return status;
  if (toolMessage?.status === MessageStatus.STOPPED)
    return ToolCallStatus.STOPPED;
  if (toolMessage?.status === MessageStatus.FAILED)
    return ToolCallStatus.FAILED;
  if (toolMessage?.status === MessageStatus.SUCCESS)
    return ToolCallStatus.SUCCESS;
  if (turnStopped) return ToolCallStatus.STOPPED;
  return toolMessage ? ToolCallStatus.RUNNING : ToolCallStatus.PENDING;
}

export function getLatestContextCompactCapacity(messages: MessageDetail[]) {
  const latestCompletedAssistantMessage = messages
    .filter(
      message =>
        message.message.role === OpenAIMessageRole.ASSISTANT &&
        message.status === MessageStatus.SUCCESS
    )
    .pop();

  const usage = latestCompletedAssistantMessage?.attrs?.usage;
  const estimatedTokens = usage?.context_compact?.estimated_tokens;
  const triggerTokens = usage?.context_compact?.trigger_tokens;
  if (
    typeof estimatedTokens === 'number' &&
    typeof triggerTokens === 'number' &&
    triggerTokens > 0
  ) {
    const percent = Math.min(
      100,
      Math.round((estimatedTokens / triggerTokens) * 100)
    );
    return {
      estimatedTokens,
      triggerTokens,
      percent,
    };
  }
  return undefined;
}
