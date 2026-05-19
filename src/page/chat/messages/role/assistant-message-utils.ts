import { OpenAIMessageRole } from '../../core/types/chat-response';
import type { MessageDetail } from '../../core/types/conversation';
import { ToolCallStatus } from '../../core/types/tool-call';

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
