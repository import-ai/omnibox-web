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
  return messages.find(
    m =>
      m.message.role === OpenAIMessageRole.TOOL &&
      m.message.tool_call_id === toolCallId
  );
}

export function resolveToolCallStatus(
  toolMessage?: Pick<MessageDetail, 'attrs'>
): ToolCallStatus {
  const toolCallStatus = toolMessage?.attrs?.tool_call?.status;
  if (toolCallStatus && isTerminalToolCallStatus(toolCallStatus)) {
    return toolCallStatus;
  }
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
